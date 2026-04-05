from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from bson import ObjectId

from app.database import get_collection
from app.auth import get_current_user
from app.agent import run_agent, AgentStatus
from app.models import JobResponse


router = APIRouter(prefix="/jobs", tags=["Jobs"])


# Request/Response schemas
class JobSearchRequest(BaseModel):
    query: str
    location: Optional[str] = None
    job_type: Optional[str] = None  # full-time, part-time, internship, contract


class JobSearchResponse(BaseModel):
    status: str
    status_message: str
    jobs: List[dict]


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


@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(
    request: JobSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for jobs using AI agent"""
    try:
        final_state = await run_agent(
            user_id=current_user["id"],
            task_type="job_search",
            search_query=request.query
        )
        
        jobs = final_state.get("jobs", []) if isinstance(final_state, dict) else []
        
        # Save searched jobs to database
        if jobs:
            jobs_collection = get_collection("jobs")
            for job in jobs:
                job_doc = {
                    "user_id": current_user["id"],
                    "search_query": request.query,
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
                    "searched_at": datetime.utcnow()
                }
                await jobs_collection.insert_one(job_doc)
        
        return JobSearchResponse(
            status=final_state.get("status", AgentStatus.COMPLETED.value) if isinstance(final_state, dict) else AgentStatus.COMPLETED.value,
            status_message=final_state.get("status_message", "Search completed") if isinstance(final_state, dict) else "Search completed",
            jobs=jobs
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search jobs: {str(e)}"
        )


@router.get("/saved", response_model=List[SavedJobResponse])
async def get_saved_jobs(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get user's saved/searched jobs"""
    jobs_collection = get_collection("jobs")
    
    cursor = jobs_collection.find(
        {"user_id": current_user["id"]}
    ).sort("searched_at", -1).limit(limit)
    
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
            saved_at=job["searched_at"]
        )
        for job in jobs
    ]


@router.post("/{job_id}/generate-resume")
async def generate_resume_for_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate a resume tailored for a specific job"""
    jobs_collection = get_collection("jobs")
    
    # Get the job
    job = await jobs_collection.find_one({
        "_id": ObjectId(job_id),
        "user_id": current_user["id"]
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Generate resume using job description
    job_description = f"""
    Position: {job['title']}
    Company: {job['company']}
    Location: {job.get('location', 'Not specified')}
    
    Description:
    {job.get('description', 'No description available')}
    """
    
    try:
        final_state = await run_agent(
            user_id=current_user["id"],
            task_type="resume_generation",
            job_description=job_description,
            user_instructions=f"Tailor this resume for the {job['title']} position at {job['company']}"
        )
        
        resume_id = final_state.get("resume_id") if isinstance(final_state, dict) else None
        
        # Update job with resume reference
        if resume_id:
            await jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {
                    "$set": {
                        "has_generated_resume": True,
                        "resume_id": resume_id
                    }
                }
            )
        
        return {
            "status": final_state.get("status", AgentStatus.COMPLETED.value) if isinstance(final_state, dict) else AgentStatus.COMPLETED.value,
            "status_message": final_state.get("status_message", "Resume generated!") if isinstance(final_state, dict) else "Resume generated!",
            "resume_id": resume_id,
            "has_pdf": final_state.get("pdf_data") is not None if isinstance(final_state, dict) else False
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate resume: {str(e)}"
        )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a saved job"""
    jobs_collection = get_collection("jobs")
    
    result = await jobs_collection.delete_one({
        "_id": ObjectId(job_id),
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return None
