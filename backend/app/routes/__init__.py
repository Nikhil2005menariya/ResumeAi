from app.routes.auth import router as auth_router
from app.routes.profile import router as profile_router
from app.routes.projects import router as projects_router
from app.routes.resumes import router as resumes_router
from app.routes.jobs import router as jobs_router
from app.routes.tasks import router as tasks_router
from app.routes.websocket import router as websocket_router

__all__ = [
    "auth_router", 
    "profile_router", 
    "projects_router",
    "resumes_router",
    "jobs_router",
    "tasks_router",
    "websocket_router"
]
