from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from bson import ObjectId

from app.database import get_collection
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_otp,
    verify_otp,
    get_current_user,
    send_otp_email,
    send_welcome_email,
    auth0_service,
)
from app.models import UserCreate, UserResponse


router = APIRouter(prefix="/auth", tags=["Authentication"])


# Request/Response schemas
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    code: str


class ResendOTPRequest(BaseModel):
    email: EmailStr


class Auth0LoginRequest(BaseModel):
    access_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str


@router.post("/signup", response_model=MessageResponse)
async def signup(request: SignupRequest):
    """Sign up with email and password"""
    users_collection = get_collection("users")
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": request.email})
    if existing_user:
        if existing_user.get("is_verified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            # User exists but not verified, allow re-sending OTP
            pass
    else:
        # Create new user
        user_data = {
            "email": request.email,
            "full_name": request.full_name,
            "hashed_password": get_password_hash(request.password),
            "is_verified": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_collection.insert_one(user_data)
    
    # Generate and send OTP
    otp_code = await create_otp(request.email)
    email_sent = await send_otp_email(request.email, otp_code)
    
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email"
        )
    
    return {"message": "Verification code sent to your email"}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_endpoint(request: OTPVerifyRequest):
    """Verify OTP and complete signup"""
    users_collection = get_collection("users")
    
    # Verify OTP
    is_valid = await verify_otp(request.email, request.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Mark user as verified
    user = await users_collection.find_one_and_update(
        {"email": request.email},
        {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create initial profile
    profiles_collection = get_collection("profiles")
    existing_profile = await profiles_collection.find_one({"user_id": str(user["_id"])})
    if not existing_profile:
        await profiles_collection.insert_one({
            "user_id": str(user["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
    
    # Send welcome email
    await send_welcome_email(request.email, user.get("full_name"))
    
    # Generate access token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user.get("full_name"),
            is_verified=True,
            created_at=user["created_at"]
        )
    }


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(request: ResendOTPRequest):
    """Resend OTP to email"""
    users_collection = get_collection("users")
    
    user = await users_collection.find_one({"email": request.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate and send new OTP
    otp_code = await create_otp(request.email)
    email_sent = await send_otp_email(request.email, otp_code)
    
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email"
        )
    
    return {"message": "New verification code sent to your email"}


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login with email and password"""
    users_collection = get_collection("users")
    
    user = await users_collection.find_one({"email": request.email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.get("hashed_password"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses social login. Please sign in with Google."
        )
    
    if not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first"
        )
    
    # Generate access token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user.get("full_name"),
            is_verified=user.get("is_verified", False),
            created_at=user["created_at"]
        )
    }


@router.post("/auth0", response_model=TokenResponse)
@router.post("/auth0-verify", response_model=TokenResponse)
async def auth0_login(request: Auth0LoginRequest):
    """Login/Signup with Auth0 token (Google, etc.)"""
    # Get user info from Auth0
    user_info = await auth0_service.get_user_info(request.access_token)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Auth0 token"
        )
    
    users_collection = get_collection("users")
    
    # Find or create user
    email = user_info.get("email")
    auth0_id = user_info.get("sub")
    
    user = await users_collection.find_one({
        "$or": [{"email": email}, {"auth0_id": auth0_id}]
    })
    
    if user:
        # Update Auth0 ID if needed
        if not user.get("auth0_id"):
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"auth0_id": auth0_id, "updated_at": datetime.utcnow()}}
            )
    else:
        # Create new user
        user_data = {
            "email": email,
            "full_name": user_info.get("name"),
            "auth0_id": auth0_id,
            "is_verified": True,  # Auth0 handles verification
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await users_collection.insert_one(user_data)
        user = await users_collection.find_one({"_id": result.inserted_id})
        
        # Create initial profile
        profiles_collection = get_collection("profiles")
        await profiles_collection.insert_one({
            "user_id": str(user["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
    
    # Generate access token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user.get("full_name"),
            is_verified=True,
            created_at=user["created_at"]
        )
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    users_collection = get_collection("users")
    user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user.get("full_name"),
        is_verified=user.get("is_verified", False),
        created_at=user["created_at"]
    )
