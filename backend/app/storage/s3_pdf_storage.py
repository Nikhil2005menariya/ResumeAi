from functools import lru_cache
from typing import Dict, Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.config import settings


def _get_bucket_name() -> str:
    if not settings.aws_s3_bucket_name:
        raise RuntimeError("AWS_S3_BUCKET_NAME is not configured")
    return settings.aws_s3_bucket_name


@lru_cache()
def _get_s3_client():
    client_kwargs = {
        "service_name": "s3",
        "region_name": settings.aws_region,
    }

    if settings.aws_access_key_id and settings.aws_secret_access_key:
        client_kwargs["aws_access_key_id"] = settings.aws_access_key_id
        client_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key

    if settings.aws_session_token:
        client_kwargs["aws_session_token"] = settings.aws_session_token

    if settings.aws_s3_endpoint_url:
        client_kwargs["endpoint_url"] = settings.aws_s3_endpoint_url

    return boto3.client(**client_kwargs)


def get_resume_pdf_key(resume_id: str) -> str:
    return f"resumes/{resume_id}.pdf"


def build_pdf_s3_uri(pdf_key: str) -> str:
    return f"s3://{_get_bucket_name()}/{pdf_key}"


def upload_resume_pdf(resume_id: str, pdf_data: bytes) -> str:
    pdf_key = get_resume_pdf_key(resume_id)

    try:
        _get_s3_client().put_object(
            Bucket=_get_bucket_name(),
            Key=pdf_key,
            Body=pdf_data,
            ContentType="application/pdf",
        )
    except (ClientError, NoCredentialsError) as exc:
        raise RuntimeError(f"Failed to upload PDF to S3: {exc}") from exc

    return pdf_key


def get_resume_pdf(resume_id: str) -> Optional[bytes]:
    pdf_key = get_resume_pdf_key(resume_id)

    try:
        response = _get_s3_client().get_object(
            Bucket=_get_bucket_name(),
            Key=pdf_key,
        )
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code in {"NoSuchKey", "404", "NotFound"}:
            return None
        raise RuntimeError(f"Failed to read PDF from S3: {exc}") from exc
    except NoCredentialsError as exc:
        raise RuntimeError(f"Failed to read PDF from S3: {exc}") from exc

    return response["Body"].read()


def get_resume_pdf_metadata(resume_id: str) -> Optional[Dict[str, int]]:
    pdf_key = get_resume_pdf_key(resume_id)

    try:
        response = _get_s3_client().head_object(
            Bucket=_get_bucket_name(),
            Key=pdf_key,
        )
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code in {"404", "NotFound", "NoSuchKey"}:
            return None
        raise RuntimeError(f"Failed to read PDF metadata from S3: {exc}") from exc
    except NoCredentialsError as exc:
        raise RuntimeError(f"Failed to read PDF metadata from S3: {exc}") from exc

    return {
        "size": response.get("ContentLength", 0),
    }


def delete_resume_pdf(resume_id: str) -> None:
    pdf_key = get_resume_pdf_key(resume_id)
    try:
        _get_s3_client().delete_object(
            Bucket=_get_bucket_name(),
            Key=pdf_key,
        )
    except (ClientError, NoCredentialsError) as exc:
        raise RuntimeError(f"Failed to delete PDF from S3: {exc}") from exc
