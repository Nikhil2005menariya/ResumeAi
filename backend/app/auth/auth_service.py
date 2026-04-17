import secrets
import random
import string
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

from app.config import settings
from app.database import get_collection


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash
    
    Note: bcrypt has a maximum password length of 72 bytes.
    Passwords longer than 72 bytes will be truncated.
    """
    # Ensure password doesn't exceed 72 bytes (bcrypt limit)
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_length(password: str) -> bool:
    """Validate password length (bcrypt max is 72 bytes)"""
    return len(password.encode('utf-8')) <= 72


def get_password_hash(password: str) -> str:
    """Hash a password
    
    Note: bcrypt has a maximum password length of 72 bytes.
    Passwords longer than 72 bytes will be truncated to 72 bytes.
    """
    # Ensure password doesn't exceed 72 bytes (bcrypt limit)
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        password = password_bytes.decode('utf-8', errors='ignore')
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get the current authenticated user from the token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Fetch user from database
    users_collection = get_collection("users")
    from bson import ObjectId
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if user is None:
        raise credentials_exception
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "full_name": user.get("full_name"),
        "is_verified": user.get("is_verified", False)
    }


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP code"""
    return ''.join(random.choices(string.digits, k=length))


async def create_otp(email: str) -> str:
    """Create and store an OTP for email verification"""
    otp_collection = get_collection("otp_codes")
    
    # Invalidate any existing OTPs for this email
    await otp_collection.update_many(
        {"email": email, "is_used": False},
        {"$set": {"is_used": True}}
    )
    
    # Generate new OTP
    code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    await otp_collection.insert_one({
        "email": email,
        "code": code,
        "expires_at": expires_at,
        "is_used": False,
        "created_at": datetime.utcnow()
    })
    
    return code


async def verify_otp(email: str, code: str) -> bool:
    """Verify an OTP code"""
    otp_collection = get_collection("otp_codes")
    
    otp = await otp_collection.find_one({
        "email": email,
        "code": code,
        "is_used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if otp:
        # Mark as used
        await otp_collection.update_one(
            {"_id": otp["_id"]},
            {"$set": {"is_used": True}}
        )
        return True
    
    return False


class Auth0Service:
    """Auth0 authentication service"""
    
    def __init__(self):
        self.domain = settings.auth0_domain
        self.client_id = settings.auth0_client_id
        self.client_secret = settings.auth0_client_secret
        self.audience = settings.auth0_audience
    
    async def verify_auth0_token(self, token: str) -> Optional[dict]:
        """Verify an Auth0 token and return user info"""
        if not self.domain:
            return None
            
        try:
            async with httpx.AsyncClient() as client:
                # Get JWKS
                jwks_url = f"https://{self.domain}/.well-known/jwks.json"
                jwks_response = await client.get(jwks_url)
                jwks = jwks_response.json()
                
                # Decode token header to get kid
                unverified_header = jwt.get_unverified_header(token)
                
                # Find the key
                rsa_key = {}
                for key in jwks["keys"]:
                    if key["kid"] == unverified_header["kid"]:
                        rsa_key = {
                            "kty": key["kty"],
                            "kid": key["kid"],
                            "use": key["use"],
                            "n": key["n"],
                            "e": key["e"]
                        }
                
                if not rsa_key:
                    return None
                
                # Verify token
                payload = jwt.decode(
                    token,
                    rsa_key,
                    algorithms=["RS256"],
                    audience=self.audience,
                    issuer=f"https://{self.domain}/"
                )
                
                return payload
                
        except Exception as e:
            print(f"Auth0 token verification error: {e}")
            return None
    
    async def get_user_info(self, access_token: str) -> Optional[dict]:
        """Get user info from Auth0"""
        if not self.domain:
            return None
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://{self.domain}/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            print(f"Error getting Auth0 user info: {e}")
        
        return None


auth0_service = Auth0Service()
