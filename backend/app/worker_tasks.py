import asyncio
from datetime import datetime
from typing import Any, Dict, Optional

from bson import ObjectId

from app.agent import AgentStatus, run_agent
from app.agent.tools import compile_latex_to_pdf
from app.database import db, get_collection
from app.storage import build_pdf_s3_uri, delete_resume_pdf, upload_resume_pdf


async def _run_with_fresh_database(task_coro):
    # SimpleWorker executes many jobs in one process while each job uses asyncio.run().
    # Rebinding Motor to the current event loop per job avoids "Event loop is closed".
    await db.disconnect()
    await db.connect()
    try:
        return await task_coro
    finally:
        await db.disconnect()


def _run_task(task_coro):
    return asyncio.run(_run_with_fresh_database(task_coro))


async def _ensure_database_connection() -> None:
    if db.client is None:
        await db.connect()


def _is_valid_object_id(value: str) -> bool:
    return ObjectId.is_valid(value)


def process_generate_resume(
    user_id: str,
    job_description: str,
    instructions: Optional[str] = None,
) -> Dict[str, Any]:
    return _run_task(
        _process_generate_resume(
            user_id=user_id,
            job_description=job_description,
            instructions=instructions,
        )
    )


async def _process_generate_resume(
    user_id: str,
    job_description: str,
    instructions: Optional[str],
) -> Dict[str, Any]:
    await _ensure_database_connection()
    final_state = await run_agent(
        user_id=user_id,
        task_type="resume_generation",
        job_description=job_description,
        user_instructions=instructions,
    )

    if isinstance(final_state, dict) and final_state.get("error"):
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": final_state.get("status_message", "Error generating resume"),
            "resume_id": None,
            "has_pdf": False,
        }

    return {
        "status": final_state.get("status", AgentStatus.COMPLETED.value)
        if isinstance(final_state, dict)
        else AgentStatus.COMPLETED.value,
        "status_message": final_state.get("status_message", "Resume generated!")
        if isinstance(final_state, dict)
        else "Resume generated!",
        "resume_id": final_state.get("resume_id") if isinstance(final_state, dict) else None,
        "has_pdf": final_state.get("latex_code") is not None if isinstance(final_state, dict) else False,
    }


def process_refine_resume(
    user_id: str,
    resume_id: str,
    message: str,
) -> Dict[str, Any]:
    return _run_task(
        _process_refine_resume(
            user_id=user_id,
            resume_id=resume_id,
            message=message,
        )
    )


async def _process_refine_resume(
    user_id: str,
    resume_id: str,
    message: str,
) -> Dict[str, Any]:
    await _ensure_database_connection()
    if not _is_valid_object_id(resume_id):
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "Invalid resume id",
            "resume_id": None,
            "has_pdf": False,
        }

    resumes_collection = get_collection("resumes")
    resume = await resumes_collection.find_one(
        {
            "_id": ObjectId(resume_id),
            "user_id": user_id,
        }
    )

    if not resume:
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "Resume not found",
            "resume_id": resume_id,
            "has_pdf": False,
        }

    if not resume.get("latex_code"):
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "Resume has no LaTeX code to refine",
            "resume_id": resume_id,
            "has_pdf": False,
        }

    final_state = await run_agent(
        user_id=user_id,
        task_type="resume_refinement",
        user_message=message,
        current_resume_id=resume_id,
    )

    if isinstance(final_state, dict) and final_state.get("error"):
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": final_state.get("status_message", "Failed to refine resume"),
            "resume_id": resume_id,
            "has_pdf": False,
        }

    if isinstance(final_state, dict) and final_state.get("latex_code"):
        try:
            delete_resume_pdf(resume_id)
        except RuntimeError as exc:
            print(f"⚠️ Failed to delete S3 PDF cache for resume {resume_id}: {exc}")

        new_version = resume.get("version", 1) + 1
        await resumes_collection.update_one(
            {"_id": ObjectId(resume_id)},
            {
                "$set": {
                    "latex_code": final_state["latex_code"],
                    "pdf_data": final_state.get("pdf_data"),
                    "version": new_version,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

    return {
        "status": final_state.get("status", AgentStatus.COMPLETED.value)
        if isinstance(final_state, dict)
        else AgentStatus.COMPLETED.value,
        "status_message": final_state.get("status_message", "Resume refined!")
        if isinstance(final_state, dict)
        else "Resume refined!",
        "resume_id": resume_id,
        "has_pdf": final_state.get("pdf_data") is not None if isinstance(final_state, dict) else False,
    }


def process_recompile_resume_pdf(
    user_id: str,
    resume_id: str,
) -> Dict[str, Any]:
    return _run_task(
        _process_recompile_resume_pdf(
            user_id=user_id,
            resume_id=resume_id,
        )
    )


async def _process_recompile_resume_pdf(
    user_id: str,
    resume_id: str,
) -> Dict[str, Any]:
    await _ensure_database_connection()
    if not _is_valid_object_id(resume_id):
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "Invalid resume id",
        }

    resumes_collection = get_collection("resumes")
    resume = await resumes_collection.find_one(
        {
            "_id": ObjectId(resume_id),
            "user_id": user_id,
        }
    )

    if not resume:
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "Resume not found",
        }

    if not resume.get("latex_code"):
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "No LaTeX code available",
        }

    try:
        delete_resume_pdf(resume_id)
    except RuntimeError as exc:
        print(f"⚠️ Failed to delete existing S3 PDF before recompile for {resume_id}: {exc}")

    pdf_data = compile_latex_to_pdf(resume["latex_code"])
    if not pdf_data:
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "PDF compilation failed. Ensure Docker is running.",
        }

    if b"ReportLab" in pdf_data:
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "ReportLab detected! Docker LaTeX required.",
        }

    try:
        pdf_key = upload_resume_pdf(resume_id, pdf_data)
    except RuntimeError as exc:
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": f"Failed to upload PDF to S3: {str(exc)}",
        }

    await resumes_collection.update_one(
        {"_id": ObjectId(resume_id)},
        {
            "$set": {
                "pdf_path": build_pdf_s3_uri(pdf_key),
                "pdf_storage_key": pdf_key,
                "pdf_size": len(pdf_data),
                "pdf_compiled_at": datetime.utcnow(),
            },
            "$unset": {"pdf_data": ""},
        },
    )

    return {
        "status": AgentStatus.COMPLETED.value,
        "status_message": "PDF recompiled successfully with Docker LaTeX",
        "message": "PDF recompiled successfully with Docker LaTeX",
        "pdf_size": len(pdf_data),
        "pdf_path": build_pdf_s3_uri(pdf_key),
    }


def process_job_search(
    user_id: str,
    query: str,
) -> Dict[str, Any]:
    return _run_task(
        _process_job_search(
            user_id=user_id,
            query=query,
        )
    )


async def _process_job_search(
    user_id: str,
    query: str,
) -> Dict[str, Any]:
    await _ensure_database_connection()
    final_state = await run_agent(
        user_id=user_id,
        task_type="job_search",
        search_query=query,
    )

    jobs = final_state.get("jobs", []) if isinstance(final_state, dict) else []
    if jobs:
        jobs_collection = get_collection("jobs")
        job_documents = [
            {
                "user_id": user_id,
                "search_query": query,
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "location": job.get("location"),
                "description": job.get("description"),
                "url": job.get("url", ""),
                "salary_range": job.get("salary_range"),
                "job_type": job.get("job_type"),
                "relevance_score": job.get("relevance_score"),
                "posted_date": job.get("posted_date"),
                "has_generated_resume": False,
                "searched_at": datetime.utcnow(),
            }
            for job in jobs
        ]
        await jobs_collection.insert_many(job_documents)

    return {
        "status": final_state.get("status", AgentStatus.COMPLETED.value)
        if isinstance(final_state, dict)
        else AgentStatus.COMPLETED.value,
        "status_message": final_state.get("status_message", "Search completed")
        if isinstance(final_state, dict)
        else "Search completed",
        "jobs": jobs,
    }


def process_generate_resume_for_job(
    user_id: str,
    job_id: str,
) -> Dict[str, Any]:
    return _run_task(
        _process_generate_resume_for_job(
            user_id=user_id,
            job_id=job_id,
        )
    )


async def _process_generate_resume_for_job(
    user_id: str,
    job_id: str,
) -> Dict[str, Any]:
    await _ensure_database_connection()
    if not _is_valid_object_id(job_id):
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "Invalid job id",
            "resume_id": None,
            "has_pdf": False,
        }

    jobs_collection = get_collection("jobs")
    job = await jobs_collection.find_one(
        {
            "_id": ObjectId(job_id),
            "user_id": user_id,
        }
    )

    if not job:
        return {
            "status": AgentStatus.ERROR.value,
            "status_message": "Job not found",
            "resume_id": None,
            "has_pdf": False,
        }

    job_description = (
        f"\n    Position: {job['title']}\n"
        f"    Company: {job['company']}\n"
        f"    Location: {job.get('location', 'Not specified')}\n\n"
        "    Description:\n"
        f"    {job.get('description', 'No description available')}\n    "
    )

    final_state = await run_agent(
        user_id=user_id,
        task_type="resume_generation",
        job_description=job_description,
        user_instructions=f"Tailor this resume for the {job['title']} position at {job['company']}",
    )

    resume_id = final_state.get("resume_id") if isinstance(final_state, dict) else None
    if resume_id:
        await jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "has_generated_resume": True,
                    "resume_id": resume_id,
                }
            },
        )

    return {
        "status": final_state.get("status", AgentStatus.COMPLETED.value)
        if isinstance(final_state, dict)
        else AgentStatus.COMPLETED.value,
        "status_message": final_state.get("status_message", "Resume generated!")
        if isinstance(final_state, dict)
        else "Resume generated!",
        "resume_id": resume_id,
        "has_pdf": final_state.get("pdf_data") is not None if isinstance(final_state, dict) else False,
    }
