from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId

from app.database import get_collection
from app.auth import get_current_user
from app.models import (
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse,
    ProfileInDB,
)


router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=ProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    profiles_collection = get_collection("profiles")
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    
    if not profile:
        # Create empty profile if not exists
        profile_data = {
            "user_id": current_user["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await profiles_collection.insert_one(profile_data)
        profile = await profiles_collection.find_one({"_id": result.inserted_id})
    
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    profiles_collection = get_collection("profiles")
    
    # Get existing profile
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    
    # Prepare update data (exclude None values)
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    if profile:
        # Update existing profile
        await profiles_collection.update_one(
            {"_id": profile["_id"]},
            {"$set": update_data}
        )
        profile = await profiles_collection.find_one({"_id": profile["_id"]})
    else:
        # Create new profile
        update_data["user_id"] = current_user["id"]
        update_data["created_at"] = datetime.utcnow()
        result = await profiles_collection.insert_one(update_data)
        profile = await profiles_collection.find_one({"_id": result.inserted_id})
    
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


# ==================== Education CRUD ====================

@router.post("/education", response_model=ProfileResponse)
async def add_education(
    education: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add education entry"""
    profiles_collection = get_collection("profiles")
    
    await profiles_collection.update_one(
        {"user_id": current_user["id"]},
        {
            "$push": {"education": education},
            "$set": {"updated_at": datetime.utcnow()}
        },
        upsert=True
    )
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


@router.put("/education/{index}", response_model=ProfileResponse)
async def update_education(
    index: int,
    education: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update education entry at index"""
    profiles_collection = get_collection("profiles")
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    if not profile or index >= len(profile.get("education", [])):
        raise HTTPException(status_code=404, detail="Education entry not found")
    
    await profiles_collection.update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                f"education.{index}": education,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


@router.delete("/education/{index}", response_model=ProfileResponse)
async def delete_education(
    index: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete education entry at index"""
    profiles_collection = get_collection("profiles")
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    if not profile or index >= len(profile.get("education", [])):
        raise HTTPException(status_code=404, detail="Education entry not found")
    
    education_list = profile.get("education", [])
    education_list.pop(index)
    
    await profiles_collection.update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                "education": education_list,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


# ==================== Experience CRUD ====================

@router.post("/experience", response_model=ProfileResponse)
async def add_experience(
    experience: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add experience entry"""
    profiles_collection = get_collection("profiles")
    
    await profiles_collection.update_one(
        {"user_id": current_user["id"]},
        {
            "$push": {"experience": experience},
            "$set": {"updated_at": datetime.utcnow()}
        },
        upsert=True
    )
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


@router.put("/experience/{index}", response_model=ProfileResponse)
async def update_experience(
    index: int,
    experience: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update experience entry at index"""
    profiles_collection = get_collection("profiles")
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    if not profile or index >= len(profile.get("experience", [])):
        raise HTTPException(status_code=404, detail="Experience entry not found")
    
    await profiles_collection.update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                f"experience.{index}": experience,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


@router.delete("/experience/{index}", response_model=ProfileResponse)
async def delete_experience(
    index: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete experience entry at index"""
    profiles_collection = get_collection("profiles")
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    if not profile or index >= len(profile.get("experience", [])):
        raise HTTPException(status_code=404, detail="Experience entry not found")
    
    experience_list = profile.get("experience", [])
    experience_list.pop(index)
    
    await profiles_collection.update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                "experience": experience_list,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


# ==================== Skills CRUD ====================

@router.post("/skills", response_model=ProfileResponse)
async def add_skill(
    skill: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add skill"""
    profiles_collection = get_collection("profiles")
    
    await profiles_collection.update_one(
        {"user_id": current_user["id"]},
        {
            "$push": {"skills": skill},
            "$set": {"updated_at": datetime.utcnow()}
        },
        upsert=True
    )
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )


@router.delete("/skills/{index}", response_model=ProfileResponse)
async def delete_skill(
    index: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete skill at index"""
    profiles_collection = get_collection("profiles")
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    if not profile or index >= len(profile.get("skills", [])):
        raise HTTPException(status_code=404, detail="Skill not found")
    
    skills_list = profile.get("skills", [])
    skills_list.pop(index)
    
    await profiles_collection.update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                "skills": skills_list,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    profile = await profiles_collection.find_one({"user_id": current_user["id"]})
    return ProfileResponse(
        id=str(profile["_id"]),
        user_id=profile["user_id"],
        headline=profile.get("headline"),
        summary=profile.get("summary"),
        phone=profile.get("phone"),
        location=profile.get("location"),
        linkedin_url=profile.get("linkedin_url"),
        github_url=profile.get("github_url"),
        portfolio_url=profile.get("portfolio_url"),
        education=profile.get("education", []),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        certifications=profile.get("certifications", []),
        languages=profile.get("languages", []),
        created_at=profile["created_at"],
        updated_at=profile["updated_at"]
    )
