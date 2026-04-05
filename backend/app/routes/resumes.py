from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Response
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from bson import ObjectId
import io
import base64
import os
from pathlib import Path

from app.database import get_collection
from app.auth import get_current_user
from app.agent import run_agent, AgentStatus
from app.models import ResumeResponse

# PDF Storage Directory
PDF_STORAGE_DIR = Path(__file__).parent.parent.parent / "storage" / "pdfs"
PDF_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/resumes", tags=["Resumes"])


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
    latex_code: Optional[str] = None
    has_pdf: bool = False
    ats_score: Optional[float] = None
    version: int
    created_at: datetime
    updated_at: datetime


class AgentStatusResponse(BaseModel):
    status: str
    status_message: str
    resume_id: Optional[str] = None
    has_pdf: bool = False


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
    
    return ResumeDetailResponse(
        id=str(resume["_id"]),
        user_id=resume["user_id"],
        title=resume["title"],
        job_description=resume.get("job_description"),
        latex_code=resume.get("latex_code"),
        has_pdf=resume.get("latex_code") is not None,  # Has PDF if we have LaTeX to compile
        ats_score=resume.get("ats_score"),
        version=resume.get("version", 1),
        created_at=resume["created_at"],
        updated_at=resume["updated_at"]
    )


@router.get("/{resume_id}/pdf")
async def get_resume_pdf(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download resume as PDF - ALWAYS compile fresh with Docker LaTeX"""
    resumes_collection = get_collection("resumes")
    
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.get("latex_code"):
        raise HTTPException(status_code=404, detail="No LaTeX code available")
    
    # ALWAYS compile fresh with Docker LaTeX - no MongoDB binary storage
    from app.agent.tools import compile_latex_to_pdf
    
    print(f"🔄 Compiling PDF for resume {resume_id} using Docker LaTeX...")
    pdf_data = compile_latex_to_pdf(resume["latex_code"])
    
    if not pdf_data:
        raise HTTPException(
            status_code=500, 
            detail="PDF compilation failed. Ensure Docker is running with texlive image."
        )
    
    # Verify it's NOT a ReportLab PDF
    if b"ReportLab" in pdf_data:
        raise HTTPException(
            status_code=500,
            detail="ReportLab fallback detected! Docker LaTeX compilation required."
        )
    
    print(f"✅ PDF compiled: {len(pdf_data)} bytes (Docker LaTeX)")
    
    # Save PDF to file storage
    pdf_filename = f"{resume_id}.pdf"
    pdf_path = PDF_STORAGE_DIR / pdf_filename
    
    with open(pdf_path, "wb") as f:
        f.write(pdf_data)
    
    print(f"💾 PDF saved to: {pdf_path}")
    
    # Update database with file path (not binary data)
    await resumes_collection.update_one(
        {"_id": ObjectId(resume_id)},
        {
            "$set": {
                "pdf_path": str(pdf_path),
                "pdf_size": len(pdf_data),
                "pdf_compiled_at": datetime.utcnow()
            },
            "$unset": {"pdf_data": ""}  # Remove old binary data
        }
    )
    
    # Return the PDF file
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"{resume['title']}.pdf"
    )


@router.get("/{resume_id}/preview")
async def get_resume_preview(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get resume PDF for preview - ALWAYS compile fresh with Docker LaTeX"""
    resumes_collection = get_collection("resumes")
    
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.get("latex_code"):
        raise HTTPException(status_code=404, detail="No LaTeX code available")
    
    # Check if we have a recently compiled PDF file
    pdf_path = PDF_STORAGE_DIR / f"{resume_id}.pdf"
    
    if pdf_path.exists():
        # Verify the file is valid (not empty, not too small)
        file_size = pdf_path.stat().st_size
        if file_size > 10000:  # Must be > 10KB for a real LaTeX PDF
            print(f"📄 Serving cached PDF: {pdf_path} ({file_size} bytes)")
            return FileResponse(
                path=pdf_path,
                media_type="application/pdf",
                headers={"Content-Disposition": "inline"}
            )
    
    # Compile fresh with Docker LaTeX
    from app.agent.tools import compile_latex_to_pdf
    
    print(f"🔄 Compiling PDF preview for resume {resume_id}...")
    pdf_data = compile_latex_to_pdf(resume["latex_code"])
    
    if not pdf_data:
        raise HTTPException(
            status_code=500, 
            detail="PDF compilation failed. Ensure Docker is running with texlive image."
        )
    
    # Verify it's NOT a ReportLab PDF
    if b"ReportLab" in pdf_data:
        raise HTTPException(
            status_code=500,
            detail="ReportLab fallback detected! Docker LaTeX compilation required."
        )
    
    print(f"✅ PDF compiled for preview: {len(pdf_data)} bytes")
    
    # Save to file
    with open(pdf_path, "wb") as f:
        f.write(pdf_data)
    
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"}
    )


@router.post("/{resume_id}/recompile")
async def recompile_resume_pdf(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Force recompile PDF with Docker LaTeX - removes any old cached/ReportLab PDF"""
    resumes_collection = get_collection("resumes")
    
    resume = await resumes_collection.find_one({
        "_id": ObjectId(resume_id),
        "user_id": current_user["id"]
    })
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.get("latex_code"):
        raise HTTPException(status_code=404, detail="No LaTeX code available")
    
    # Delete old PDF file if exists
    pdf_path = PDF_STORAGE_DIR / f"{resume_id}.pdf"
    if pdf_path.exists():
        pdf_path.unlink()
        print(f"🗑️ Deleted old PDF: {pdf_path}")
    
    # Compile fresh with Docker LaTeX
    from app.agent.tools import compile_latex_to_pdf
    
    print(f"🔄 Force recompiling PDF for resume {resume_id}...")
    pdf_data = compile_latex_to_pdf(resume["latex_code"])
    
    if not pdf_data:
        raise HTTPException(
            status_code=500, 
            detail="PDF compilation failed. Ensure Docker is running."
        )
    
    if b"ReportLab" in pdf_data:
        raise HTTPException(
            status_code=500,
            detail="ReportLab detected! Docker LaTeX required."
        )
    
    # Save to file
    with open(pdf_path, "wb") as f:
        f.write(pdf_data)
    
    # Update database
    await resumes_collection.update_one(
        {"_id": ObjectId(resume_id)},
        {
            "$set": {
                "pdf_path": str(pdf_path),
                "pdf_size": len(pdf_data),
                "pdf_compiled_at": datetime.utcnow()
            },
            "$unset": {"pdf_data": ""}  # Remove old binary
        }
    )
    
    return {
        "message": "PDF recompiled successfully with Docker LaTeX",
        "pdf_size": len(pdf_data),
        "pdf_path": str(pdf_path)
    }


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


@router.post("/generate", response_model=AgentStatusResponse)
async def generate_resume(
    request: GenerateResumeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate a new resume using AI agent"""
    try:
        final_state = await run_agent(
            user_id=current_user["id"],
            task_type="resume_generation",
            job_description=request.job_description,
            user_instructions=request.instructions
        )
        
        if isinstance(final_state, dict) and final_state.get("error"):
            return AgentStatusResponse(
                status=AgentStatus.ERROR.value,
                status_message=final_state.get("status_message", "Error generating resume"),
                resume_id=None,
                has_pdf=False
            )
        
        return AgentStatusResponse(
            status=final_state.get("status", AgentStatus.COMPLETED.value) if isinstance(final_state, dict) else AgentStatus.COMPLETED.value,
            status_message=final_state.get("status_message", "Resume generated!") if isinstance(final_state, dict) else "Resume generated!",
            resume_id=final_state.get("resume_id") if isinstance(final_state, dict) else None,
            has_pdf=final_state.get("latex_code") is not None if isinstance(final_state, dict) else False  # Has PDF if we have LaTeX
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate resume: {str(e)}"
        )


@router.post("/{resume_id}/refine", response_model=AgentStatusResponse)
async def refine_resume(
    resume_id: str,
    request: RefineResumeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Refine an existing resume based on user feedback"""
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
        print(f"🔧 Starting refinement for resume {resume_id} with message: {request.message[:50]}...")
        
        final_state = await run_agent(
            user_id=current_user["id"],
            task_type="resume_refinement",
            user_message=request.message,
            current_resume_id=resume_id
        )
        
        print(f"🔧 Agent result type: {type(final_state)}")
        print(f"🔧 Agent result keys: {list(final_state.keys()) if isinstance(final_state, dict) else 'Not a dict'}")
        print(f"🔧 Has error: {final_state.get('error') if isinstance(final_state, dict) else 'N/A'}")
        
        # Check for agent errors
        if final_state and isinstance(final_state, dict) and final_state.get("error"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Refinement failed: {final_state.get('error', 'Unknown error')}"
            )
        
        # Update the resume with new content if we have LaTeX
        if final_state and isinstance(final_state, dict) and final_state.get("latex_code"):
            new_version = resume.get("version", 1) + 1
            await resumes_collection.update_one(
                {"_id": ObjectId(resume_id)},
                {
                    "$set": {
                        "latex_code": final_state["latex_code"],
                        "pdf_data": final_state.get("pdf_data"),
                        "version": new_version,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            print(f"✅ Resume updated with new LaTeX")
        
        return AgentStatusResponse(
            status=final_state.get("status", AgentStatus.COMPLETED.value) if isinstance(final_state, dict) else AgentStatus.COMPLETED.value,
            status_message=final_state.get("status_message", "Resume refined!") if isinstance(final_state, dict) else "Resume refined!",
            resume_id=resume_id,
            has_pdf=final_state.get("pdf_data") is not None if isinstance(final_state, dict) else False
        )
        
    except Exception as e:
        print(f"❌ Exception in refine endpoint: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refine resume: {str(e)}"
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
    
    return None
