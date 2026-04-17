from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import logging
import sys

from app.config import settings
from app.database import db
from app.routes import (
    auth_router,
    profile_router,
    projects_router,
    resumes_router,
    jobs_router,
    tasks_router,
    websocket_router,
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/resume_maker.log')
    ]
)

logger = logging.getLogger(__name__)
logger.info("🚀 Application startup...")



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    await db.connect()
    yield
    # Shutdown
    await db.disconnect()


# Create FastAPI app
app = FastAPI(
    title="Resume Maker AI",
    description="AI-powered resume builder and job search platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(resumes_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(websocket_router)


# ==================== Health & Info Endpoints ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Resume Maker AI",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/info")
async def api_info():
    """API information"""
    return {
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "profile": "/api/profile",
            "projects": "/api/projects",
            "resumes": "/api/resumes",
            "jobs": "/api/jobs",
            "tasks": "/api/tasks"
        }
    }


# Export for uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
