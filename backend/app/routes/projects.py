from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId

from app.database import get_collection
from app.auth import get_current_user
from app.models import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
)


router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Get all projects for current user"""
    projects_collection = get_collection("projects")
    
    cursor = projects_collection.find({"user_id": current_user["id"]})
    projects = await cursor.to_list(length=100)
    
    return [
        ProjectResponse(
            id=str(project["_id"]),
            user_id=project["user_id"],
            title=project["title"],
            description=project["description"],
            tech_stack=project.get("tech_stack", []),
            start_date=project.get("start_date"),
            end_date=project.get("end_date"),
            url=project.get("url"),
            github_url=project.get("github_url"),
            highlights=project.get("highlights", []),
            is_featured=project.get("is_featured", False),
            created_at=project["created_at"],
            updated_at=project["updated_at"]
        )
        for project in projects
    ]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific project"""
    projects_collection = get_collection("projects")
    
    project = await projects_collection.find_one({
        "_id": ObjectId(project_id),
        "user_id": current_user["id"]
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return ProjectResponse(
        id=str(project["_id"]),
        user_id=project["user_id"],
        title=project["title"],
        description=project["description"],
        tech_stack=project.get("tech_stack", []),
        start_date=project.get("start_date"),
        end_date=project.get("end_date"),
        url=project.get("url"),
        github_url=project.get("github_url"),
        highlights=project.get("highlights", []),
        is_featured=project.get("is_featured", False),
        created_at=project["created_at"],
        updated_at=project["updated_at"]
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new project"""
    projects_collection = get_collection("projects")
    
    project_dict = project_data.model_dump()
    project_dict["user_id"] = current_user["id"]
    project_dict["created_at"] = datetime.utcnow()
    project_dict["updated_at"] = datetime.utcnow()
    
    result = await projects_collection.insert_one(project_dict)
    project = await projects_collection.find_one({"_id": result.inserted_id})
    
    return ProjectResponse(
        id=str(project["_id"]),
        user_id=project["user_id"],
        title=project["title"],
        description=project["description"],
        tech_stack=project.get("tech_stack", []),
        start_date=project.get("start_date"),
        end_date=project.get("end_date"),
        url=project.get("url"),
        github_url=project.get("github_url"),
        highlights=project.get("highlights", []),
        is_featured=project.get("is_featured", False),
        created_at=project["created_at"],
        updated_at=project["updated_at"]
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a project"""
    projects_collection = get_collection("projects")
    
    # Check project exists and belongs to user
    existing = await projects_collection.find_one({
        "_id": ObjectId(project_id),
        "user_id": current_user["id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Prepare update data (exclude None values)
    update_data = {k: v for k, v in project_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": update_data}
    )
    
    project = await projects_collection.find_one({"_id": ObjectId(project_id)})
    
    return ProjectResponse(
        id=str(project["_id"]),
        user_id=project["user_id"],
        title=project["title"],
        description=project["description"],
        tech_stack=project.get("tech_stack", []),
        start_date=project.get("start_date"),
        end_date=project.get("end_date"),
        url=project.get("url"),
        github_url=project.get("github_url"),
        highlights=project.get("highlights", []),
        is_featured=project.get("is_featured", False),
        created_at=project["created_at"],
        updated_at=project["updated_at"]
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a project"""
    projects_collection = get_collection("projects")
    
    result = await projects_collection.delete_one({
        "_id": ObjectId(project_id),
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return None


@router.post("/{project_id}/feature", response_model=ProjectResponse)
async def toggle_featured(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Toggle featured status of a project"""
    projects_collection = get_collection("projects")
    
    project = await projects_collection.find_one({
        "_id": ObjectId(project_id),
        "user_id": current_user["id"]
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    new_featured = not project.get("is_featured", False)
    
    await projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"is_featured": new_featured, "updated_at": datetime.utcnow()}}
    )
    
    project = await projects_collection.find_one({"_id": ObjectId(project_id)})
    
    return ProjectResponse(
        id=str(project["_id"]),
        user_id=project["user_id"],
        title=project["title"],
        description=project["description"],
        tech_stack=project.get("tech_stack", []),
        start_date=project.get("start_date"),
        end_date=project.get("end_date"),
        url=project.get("url"),
        github_url=project.get("github_url"),
        highlights=project.get("highlights", []),
        is_featured=project.get("is_featured", False),
        created_at=project["created_at"],
        updated_at=project["updated_at"]
    )
