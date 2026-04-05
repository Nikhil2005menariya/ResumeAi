from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")


# ==================== USER MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    auth0_id: Optional[str] = None
    is_verified: bool = False
    is_active: bool = True


class UserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None  # None if using Auth0
    full_name: Optional[str] = None


class UserInDB(UserBase):
    id: Optional[str] = Field(alias="_id", default=None)
    hashed_password: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    is_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== PROFILE MODELS ====================

class Education(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None
    description: Optional[str] = None


class Experience(BaseModel):
    company: str
    position: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None  # None if current
    is_current: bool = False
    description: Optional[str] = None
    achievements: List[str] = []


class Skill(BaseModel):
    name: str
    level: Optional[str] = None  # beginner, intermediate, advanced, expert
    category: Optional[str] = None  # technical, soft, language


class Certification(BaseModel):
    name: str
    issuer: str
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None
    url: Optional[str] = None


class ProfileBase(BaseModel):
    headline: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    education: List[Education] = []
    experience: List[Experience] = []
    skills: List[Skill] = []
    certifications: List[Certification] = []
    languages: List[str] = []


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileInDB(ProfileBase):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class ProfileResponse(ProfileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== PROJECT MODELS ====================

class ProjectBase(BaseModel):
    title: str
    description: str
    tech_stack: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    url: Optional[str] = None
    github_url: Optional[str] = None
    highlights: List[str] = []
    is_featured: bool = False


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    url: Optional[str] = None
    github_url: Optional[str] = None
    highlights: Optional[List[str]] = None
    is_featured: Optional[bool] = None


class ProjectInDB(ProjectBase):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class ProjectResponse(ProjectBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== RESUME MODELS ====================

class ResumeBase(BaseModel):
    title: str
    job_description: Optional[str] = None
    custom_instructions: Optional[str] = None


class ResumeCreate(ResumeBase):
    pass


class ResumeInDB(ResumeBase):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    latex_code: Optional[str] = None
    pdf_data: Optional[bytes] = None
    pdf_url: Optional[str] = None
    ats_score: Optional[float] = None
    selected_projects: List[str] = []  # Project IDs
    selected_experience: List[int] = []  # Experience indices
    version: int = 1
    is_latest: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class ResumeResponse(BaseModel):
    id: str
    user_id: str
    title: str
    job_description: Optional[str] = None
    ats_score: Optional[float] = None
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== JOB MODELS ====================

class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    description: Optional[str] = None
    url: str
    salary_range: Optional[str] = None
    job_type: Optional[str] = None  # full-time, part-time, internship, contract
    experience_level: Optional[str] = None
    posted_date: Optional[str] = None


class JobInDB(JobBase):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    search_query: str
    relevance_score: Optional[float] = None
    has_generated_resume: bool = False
    resume_id: Optional[str] = None
    searched_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class JobResponse(JobBase):
    id: str
    user_id: str
    search_query: str
    relevance_score: Optional[float] = None
    has_generated_resume: bool
    searched_at: datetime

    class Config:
        from_attributes = True


# ==================== AGENT SESSION MODELS ====================

class AgentMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentState(BaseModel):
    current_step: str
    status: str  # planning, executing, waiting, completed, error
    progress: float = 0.0
    details: Optional[str] = None


class AgentSessionInDB(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    session_type: str  # resume_generation, job_search, resume_edit
    messages: List[AgentMessage] = []
    state: Optional[AgentState] = None
    context: dict = {}  # Working memory
    resume_id: Optional[str] = None
    job_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# ==================== OTP MODELS ====================

class OTPCode(BaseModel):
    email: EmailStr
    code: str
    expires_at: datetime
    is_used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
