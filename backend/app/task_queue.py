from typing import Any, Dict, Optional

from redis import Redis
from rq import Queue
from rq.exceptions import NoSuchJobError
from rq.job import Job

from app.config import settings


TASK_QUEUE_NAME = "long_running_tasks"

_redis_connection: Optional[Redis] = None
_task_queue: Optional[Queue] = None


def get_redis_connection() -> Redis:
    global _redis_connection
    if _redis_connection is None:
        _redis_connection = Redis.from_url(settings.redis_url)
    return _redis_connection


def get_task_queue() -> Queue:
    global _task_queue
    if _task_queue is None:
        _task_queue = Queue(
            TASK_QUEUE_NAME,
            connection=get_redis_connection(),
            default_timeout=settings.queue_job_timeout_seconds,
        )
    return _task_queue


def enqueue_task(
    task_path: str,
    task_kwargs: Dict[str, Any],
    user_id: str,
    task_type: str,
) -> str:
    queue = get_task_queue()
    job = queue.enqueue_call(
        func=task_path,
        kwargs=task_kwargs,
        timeout=settings.queue_job_timeout_seconds,
        result_ttl=settings.queue_result_ttl_seconds,
        meta={
            "user_id": user_id,
            "task_type": task_type,
        },
    )
    return job.id


def fetch_task_job(job_id: str) -> Optional[Job]:
    try:
        return Job.fetch(job_id, connection=get_redis_connection())
    except (NoSuchJobError, ValueError):
        return None
