from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from redis.exceptions import RedisError

from app.auth import get_current_user
from app.database import get_collection
from app.task_queue import enqueue_task


router = APIRouter(prefix="/jobs", tags=["Jobs"])


class JobSearchRequest(BaseModel):
    query: str
    location: Optional[str] = None
    job_type: Optional[str] = None


class TaskAcceptedResponse(BaseModel):
    job_id: str
    status: str
    status_message: str


class SavedJobResponse(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    description: Optional[str] = None
    url: str
    relevance_score: Optional[float] = None
    has_generated_resume: bool
    resume_id: Optional[str] = None
    saved_at: datetime


@router.post(
    "/search",
    response_model=TaskAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def search_jobs(
    request: JobSearchRequest,
    current_user: dict = Depends(get_current_user),
):
    """Queue job search task"""
    try:
        job_id = enqueue_task(
            task_path="app.worker_tasks.process_job_search",
            task_kwargs={
                "user_id": current_user["id"],
                "query": request.query,
            },
            user_id=current_user["id"],
            task_type="job_search",
        )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Queue unavailable: {str(exc)}",
        )

    return TaskAcceptedResponse(
        job_id=job_id,
        status="queued",
        status_message="Job search queued",
    )


@router.get("/saved", response_model=List[SavedJobResponse])
async def get_saved_jobs(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
):
    """Get user's saved/searched jobs"""
    jobs_collection = get_collection("jobs")

    cursor = jobs_collection.find({"user_id": current_user["id"]}).sort("searched_at", -1).limit(limit)
    jobs = await cursor.to_list(length=limit)

    return [
        SavedJobResponse(
            id=str(job["_id"]),
            title=job["title"],
            company=job["company"],
            location=job.get("location"),
            description=job.get("description"),
            url=job["url"],
            relevance_score=job.get("relevance_score"),
            has_generated_resume=job.get("has_generated_resume", False),
            resume_id=job.get("resume_id"),
            saved_at=job["searched_at"],
        )
        for job in jobs
    ]


@router.post(
    "/{job_id}/generate-resume",
    response_model=TaskAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_resume_for_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Queue resume generation for a specific saved job"""
    jobs_collection = get_collection("jobs")

    job = await jobs_collection.find_one(
        {
            "_id": ObjectId(job_id),
            "user_id": current_user["id"],
        }
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        job_queue_id = enqueue_task(
            task_path="app.worker_tasks.process_generate_resume_for_job",
            task_kwargs={
                "user_id": current_user["id"],
                "job_id": job_id,
            },
            user_id=current_user["id"],
            task_type="job_resume_generation",
        )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Queue unavailable: {str(exc)}",
        )

    return TaskAcceptedResponse(
        job_id=job_queue_id,
        status="queued",
        status_message="Resume generation for job queued",
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a saved job"""
    jobs_collection = get_collection("jobs")

    result = await jobs_collection.delete_one(
        {
            "_id": ObjectId(job_id),
            "user_id": current_user["id"],
        }
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")

    return None
