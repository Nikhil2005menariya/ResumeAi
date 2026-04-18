from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Response
from pydantic import BaseModel, Field
from bson import ObjectId
from redis.exceptions import RedisError

from app.database import get_collection
from app.auth import get_current_user
from app.models import ResumeResponse
from app.task_queue import enqueue_task
from app.storage import (
    delete_resume_pdf,
    get_resume_pdf as get_resume_pdf_from_storage,
    get_resume_pdf_metadata,
    upload_resume_pdf,
)

router = APIRouter(prefix="/resumes", tags=["Resumes"])
MAX_RESUMES_PER_USER = 5


# Request/Response schemas
class GenerateResumeRequest(BaseModel):
    job_description: str
    instructions: Optional[str] = None


class RefineResumeRequest(BaseModel):
    message: str


class ResumeDetailResponse(BaseModel):
    id: str
    user_id: str
    title: str
    job_description: Optional[str] = None
    custom_instructions: Optional[str] = None
    latex_code: Optional[str] = None
    has_pdf: bool = False
    ats_score: Optional[float] = None
    assistant_response: Optional[str] = None
    chat_history: List[Dict[str, Any]] = Field(default_factory=list)
    version: int
    created_at: datetime
    updated_at: datetime


class TaskAcceptedResponse(BaseModel):
    job_id: str
    status: str
    status_message: str


@router.get("", response_model=List[ResumeResponse])
async def list_resumes(current_user: dict = Depends(get_current_user)):
    """List all resumes for current user"""
    resumes_collection = get_collection("resumes")
    
    cursor = resumes_collection.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1)
    
    resumes = await cursor.to_list(length=50)
    
    return [
        ResumeResponse(
            id=str(r["_id"]),
            user_id=r["user_id"],
            title=r["title"],
            job_description=r.get("job_description"),
            ats_score=r.get("ats_score"),
            version=r.get("version", 1),
            created_at=r["created_at"],
            updated_at=r["updated_at"]
        )
        for r in resumes
    ]


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific resume with details"""
    resumes_collection = get_collection("resumes")
    
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    raw_chat_history = resume.get("chat_history") or []
    chat_history: List[Dict[str, Any]] = []
    if isinstance(raw_chat_history, list):
        for item in raw_chat_history:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            content = item.get("content")
            if not isinstance(role, str) or not isinstance(content, str):
                continue
            timestamp = item.get("timestamp")
            if isinstance(timestamp, datetime):
                timestamp_value = timestamp
            else:
                timestamp_value = resume.get("updated_at", datetime.utcnow())
            chat_history.append(
                {
                    "role": role,
                    "content": content,
                    "timestamp": timestamp_value,
                }
            )
    
    return ResumeDetailResponse(
        id=str(resume["_id"]),
        user_id=resume["user_id"],
        title=resume["title"],
        job_description=resume.get("job_description"),
        custom_instructions=resume.get("custom_instructions"),
        latex_code=resume.get("latex_code"),
        has_pdf=resume.get("latex_code") is not None,  # Has PDF if we have LaTeX to compile
        ats_score=resume.get("ats_score"),
        assistant_response=resume.get("assistant_response"),
        chat_history=chat_history,
        version=resume.get("version", 1),
        created_at=resume["created_at"],
        updated_at=resume["updated_at"]
    )


@router.get("/{resume_id}/pdf")
async def get_resume_pdf(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download resume PDF from S3 cache."""
    resumes_collection = get_collection("resumes")
    
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        pdf_data = get_resume_pdf_from_storage(resume_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=f"S3 read failed: {str(exc)}")

    if not pdf_data:
        raise HTTPException(
            status_code=404,
            detail="No compiled PDF found. Please recompile this resume once, then try downloading again.",
        )

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{resume["title"]}.pdf"'},
    )


@router.get("/{resume_id}/preview")
async def get_resume_preview(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get resume PDF for preview - always compile fresh when no cached PDF exists."""
    resumes_collection = get_collection("resumes")
    
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.get("latex_code"):
        raise HTTPException(status_code=404, detail="No LaTeX code available")
    
    try:
        cached_pdf_meta = get_resume_pdf_metadata(resume_id)
        if cached_pdf_meta and cached_pdf_meta["size"] > 10000:
            cached_pdf_data = get_resume_pdf_from_storage(resume_id)
            if cached_pdf_data:
                print(f"📄 Serving cached PDF from S3 for {resume_id} ({cached_pdf_meta['size']} bytes)")
                return Response(
                    content=cached_pdf_data,
                    media_type="application/pdf",
                    headers={"Content-Disposition": "inline"},
                )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=f"S3 read failed: {str(exc)}")
    
    # Compile fresh with Texapi
    from app.agent.tools import compile_latex_to_pdf
    
    print(f"🔄 Compiling PDF preview for resume {resume_id}...")
    pdf_data = compile_latex_to_pdf(resume["latex_code"])
    
    if not pdf_data:
        raise HTTPException(
            status_code=500, 
            detail="PDF compilation failed with Texapi. Check TEXAPI_API_KEY and Texapi service availability."
        )
    
    print(f"✅ PDF compiled for preview: {len(pdf_data)} bytes")
    
    try:
        upload_resume_pdf(resume_id, pdf_data)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(exc)}")
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"},
    )


@router.post(
    "/{resume_id}/recompile",
    response_model=TaskAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def recompile_resume_pdf(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Queue PDF recompilation task"""
    resumes_collection = get_collection("resumes")
    
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.get("latex_code"):
        raise HTTPException(status_code=404, detail="No LaTeX code available")

    try:
        job_id = enqueue_task(
            task_path="app.worker_tasks.process_recompile_resume_pdf",
            task_kwargs={
                "user_id": current_user["id"],
                "resume_id": resume_id,
            },
            user_id=current_user["id"],
            task_type="resume_recompile",
        )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Queue unavailable: {str(exc)}",
        )

    return TaskAcceptedResponse(
        job_id=job_id,
        status="queued",
        status_message="Resume PDF recompilation queued",
    )


@router.get("/{resume_id}/latex")
async def get_resume_latex(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get resume LaTeX code"""
    resumes_collection = get_collection("resumes")
    
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.get("latex_code"):
        raise HTTPException(status_code=404, detail="LaTeX code not available")
    
    return Response(
        content=resume["latex_code"],
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{resume["title"]}.tex"'
        }
    )


@router.post(
    "/generate",
    response_model=TaskAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_resume(
    request: GenerateResumeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Queue resume generation task"""
    resumes_collection = get_collection("resumes")
    current_resume_count = await resumes_collection.count_documents({"user_id": current_user["id"]})
    if current_resume_count >= MAX_RESUMES_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume limit reached (max 5). Please delete an older resume to generate a new one.",
        )

    try:
        job_id = enqueue_task(
            task_path="app.worker_tasks.process_generate_resume",
            task_kwargs={
                "user_id": current_user["id"],
                "job_description": request.job_description,
                "instructions": request.instructions,
            },
            user_id=current_user["id"],
            task_type="resume_generation",
        )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Queue unavailable: {str(exc)}",
        )

    return TaskAcceptedResponse(
        job_id=job_id,
        status="queued",
        status_message="Resume generation queued",
    )


@router.post(
    "/{resume_id}/refine",
    response_model=TaskAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def refine_resume(
    resume_id: str,
    request: RefineResumeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Queue resume refinement task"""
    resumes_collection = get_collection("resumes")
    
    # Get existing resume
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.get("latex_code"):
        raise HTTPException(status_code=400, detail="Resume has no LaTeX code to refine")

    try:
        job_id = enqueue_task(
            task_path="app.worker_tasks.process_refine_resume",
            task_kwargs={
                "user_id": current_user["id"],
                "resume_id": resume_id,
                "message": request.message,
            },
            user_id=current_user["id"],
            task_type="resume_refinement",
        )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Queue unavailable: {str(exc)}",
        )

    return TaskAcceptedResponse(
        job_id=job_id,
        status="queued",
        status_message="Resume refinement queued",
    )


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a resume"""
    resumes_collection = get_collection("resumes")
    
    result = await resumes_collection.delete_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    try:
        delete_resume_pdf(resume_id)
        print(f"🗑️ Deleted PDF for resume {resume_id} from S3")
    except RuntimeError as exc:
        print(f"⚠️ Failed to delete PDF from S3 for resume {resume_id}: {exc}")
    
    return None
