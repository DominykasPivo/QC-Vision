import json
import logging
import os
from functools import lru_cache
from io import BytesIO

from minio import Minio
from minio.error import S3Error

logger = logging.getLogger("backend_photos_storage")


def _is_testing() -> bool:
    return (
        os.getenv("ENV", "").lower() == "test"
        or os.getenv("PYTEST_CURRENT_TEST") is not None
    )


class PhotoStorage:
    """Handles photo storage operations with MinIO"""

    def __init__(self):
        self.client = Minio(
            endpoint=os.getenv("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
            secure=False,
        )

        self.bucket_name = os.getenv("MINIO_BUCKET", "qc-vision-photos")
        self.public_endpoint = os.getenv("MINIO_PUBLIC_ENDPOINT", "localhost:9000")
        self.internal_endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")

        # ✅ do not make network calls during pytest
        if not _is_testing():
            self._ensure_bucket_exists()
        else:
            logger.info("PhotoStorage: test mode -> skipping bucket check")

    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist and configure for public read access"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")

            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{self.bucket_name}/*"],
                    }
                ],
            }

            try:
                self.client.set_bucket_policy(self.bucket_name, json.dumps(policy))
                logger.info(f"Public read policy set for bucket: {self.bucket_name}")
            except Exception as policy_error:
                logger.warning(f"Could not set bucket policy: {str(policy_error)}")

        except S3Error as e:
            logger.error(f"Failed to create bucket: {str(e)}")

    async def upload_photo(self, photo_bytes: bytes, photo_path: str, content_type: str):
        """Upload a photo to MinIO storage."""
        try:
            file_data = BytesIO(photo_bytes)
            file_size = len(photo_bytes)

            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=photo_path,
                data=file_data,
                length=file_size,
                content_type=content_type,
            )
            logger.info(f"Uploaded photo to MinIO: {photo_path} ({file_size} bytes)")
            return photo_path
        except S3Error as e:
            logger.error(f"Failed to upload photo: {str(e)}")
            raise

    async def get_photo(self, file_path: str) -> bytes:
        """Retrieve photo from MinIO. Downloads the photo data as bytes"""
        try:
            response = self.client.get_object(
                bucket_name=self.bucket_name, object_name=file_path
            )
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            logger.error(f"Failed to retrieve photo: {str(e)}")
            raise

    async def delete_photo(self, file_path: str) -> bool:
        """Delete photo from MinIO"""
        try:
            self.client.remove_object(bucket_name=self.bucket_name, object_name=file_path)
            return True
        except S3Error as e:
            logger.error(f"Failed to delete photo: {str(e)}")
            raise

    def generate_presigned_url(self, file_path: str, expiration: int = 3600) -> str:
        """Generate a public URL for photo access (bucket is public)."""
        try:
            return f"http://{self.public_endpoint}/{self.bucket_name}/{file_path}"
        except Exception as e:
            logger.error(f"Failed to generate URL: {str(e)}")
            return ""


# ✅ must exist (your router imports it)
@lru_cache(maxsize=1)
def get_photo_storage() -> PhotoStorage:
    return PhotoStorage()


# ✅ optional backward compatibility for old imports
photo_storage = get_photo_storage()