from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from redis.exceptions import RedisError

from app.auth import get_current_user
from app.task_queue import fetch_task_job


router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskStatusResponse(BaseModel):
    job_id: str
    task_type: Optional[str] = None
    status: str
    status_message: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


STATUS_MAP = {
    "queued": ("queued", "Queued for processing"),
    "deferred": ("queued", "Queued for processing"),
    "scheduled": ("queued", "Queued for processing"),
    "started": ("in_progress", "Task is running"),
    "finished": ("completed", "Task completed"),
    "failed": ("failed", "Task failed"),
    "stopped": ("failed", "Task failed"),
    "canceled": ("failed", "Task canceled"),
}


def _extract_error_message(exc_info: Optional[str]) -> Optional[str]:
    if not exc_info:
        return None

    lines = [line.strip() for line in exc_info.splitlines() if line.strip()]
    return lines[-1] if lines else None


@router.get("/{job_id}", response_model=TaskStatusResponse)
async def get_task_status(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get queue job status and result"""
    try:
        job = fetch_task_job(job_id)
    except RedisError as exc:
        raise HTTPException(status_code=503, detail=f"Queue unavailable: {str(exc)}")
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = job.meta.get("user_id")
    if user_id != current_user["id"]:
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        rq_status_raw = job.get_status(refresh=True)
    except RedisError as exc:
        raise HTTPException(status_code=503, detail=f"Queue unavailable: {str(exc)}")

    rq_status = rq_status_raw.value if hasattr(rq_status_raw, "value") else str(rq_status_raw)
    mapped_status, default_message = STATUS_MAP.get(rq_status, ("queued", "Queued for processing"))
    result = job.result if mapped_status == "completed" and isinstance(job.result, dict) else None

    status_message = default_message
    error = None

    if result and result.get("status") == "error":
        mapped_status = "failed"
        error = result.get("status_message")
        status_message = result.get("status_message", "Task failed")
    elif result and result.get("status_message"):
        status_message = result["status_message"]

    if mapped_status == "failed":
        error = error or _extract_error_message(job.exc_info) or "Task failed"

    return TaskStatusResponse(
        job_id=job.id,
        task_type=job.meta.get("task_type"),
        status=mapped_status,
        status_message=status_message,
        result=result,
        error=error,
    )
