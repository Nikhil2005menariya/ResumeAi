from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "resume_maker"

    # Auth0
    auth0_domain: str = ""
    auth0_client_id: str = ""
    auth0_client_secret: str = ""
    auth0_audience: str = ""

    # JWT
    jwt_secret_key: str = "your-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Email
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_port: int = 587
    mail_server: str = "smtp.gmail.com"

    # Gemini AI
    gemini_api_key: str = ""

    # SerpAPI
    serpapi_key: str = ""
    
    # Texapi (LaTeX PDF compilation service)
    texapi_api_key: str = ""
    texapi_base_url: str = "https://texapi.ovh"

    # App URLs
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Queue / Redis
    redis_url: str = "redis://localhost:6379/0"
    queue_job_timeout_seconds: int = 1200
    queue_result_ttl_seconds: int = 3600

    # AWS S3 (resume PDF storage)
    aws_region: str = "ap-south-1"
    aws_s3_bucket_name: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""
    aws_s3_endpoint_url: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
