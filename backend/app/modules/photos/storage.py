"""
https://medium.com/@mojimich2015/fastapi-minio-integration-31b35076afcb


https://resources.min.io/c/how-to-upload-a-file-to-minio-using-python?x=p9k0ng&xs=468691
https://docs.min.io/enterprise/aistor-object-store/developers/sdk/python/
"""


import logging
import os
import sys

from minio import Minio
from minio.error import S3Error
from typing import BinaryIO
from datetime import timedelta


logger = logging.getLogger("backend_photos_storage")

class PhotoStorage:
    """Handles photo storage operations with MinIO"""
    
    def __init__(self):
        self.client = Minio(
            endpoint=os.getenv("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
            secure=False  # Set to True if using HTTPS
        )
        self.bucket_name = os.getenv("MINIO_BUCKET", "qc-vision-photos")
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as e:
            logger.error(f"Failed to create bucket: {str(e)}")


    async def upload_photo(self, photo_bytes: bytes, photo_path: str, content_type: str):
        """Upload a photo to MinIO storage."""
        try:
            from io import BytesIO
            
            file_data = BytesIO(photo_bytes)
            file_size = len(photo_bytes)

            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=photo_path,
                data=file_data,
                length=file_size,
                content_type=content_type
            )
            logger.info(f"Uploaded photo to MinIO: {photo_path} ({file_size} bytes)")
            return photo_path
        except S3Error as e:
            logger.error(f"Failed to upload photo: {str(e)}")
            raise
    
    async def get_photo(self, file_path: str) -> bytes:
        """Retrieve photo from MinIO
        
            Downloads the photo data as bytes
        """
        try:
            response = self.client.get_object(
                bucket_name=self.bucket_name,
                object_name=file_path
            )
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            logger.error(f"Failed to retrieve photo: {str(e)}")
    
    async def delete_photo(self, file_path: str) -> bool:
        """Delete photo from MinIO"""
        try:
            self.client.remove_object(
                bucket_name=self.bucket_name,
                object_name=file_path
            )
            return True
        except S3Error as e:
            logger.error(f"Failed to delete photo: {str(e)}")
    
    def generate_presigned_url(self, file_path: str, expiration: int = 3600) -> str:
        """Generate a temporary URL for photo access

            For frontend to directly access the photo without going through backend
        """
        try:
            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=file_path,
                expires=timedelta(seconds=expiration)
            )
            return url
        except S3Error as e:
            logger.error(f"Failed to generate URL: {str(e)}")


# Singleton instance
photo_storage = PhotoStorage()