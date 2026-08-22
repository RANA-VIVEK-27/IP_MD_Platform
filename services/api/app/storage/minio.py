import io
from typing import BinaryIO, Optional
from datetime import timedelta

from minio import Minio
from minio.error import S3Error

from app.storage.base import StorageBackend
from app.core.config import settings


class MinIOStorageBackend(StorageBackend):
    """MinIO / S3-compatible object storage backend."""

    def __init__(self):
        endpoint = settings.STORAGE_ENDPOINT
        access_key = settings.STORAGE_ACCESS_KEY
        secret_key = settings.STORAGE_SECRET_KEY
        secure = settings.STORAGE_USE_SSL

        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )
        self.bucket = settings.STORAGE_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self):
        """Create bucket if it does not exist."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except S3Error:
            pass

    async def upload(self, key: str, data: BinaryIO, content_type: str = "application/octet-stream", size: int = 0) -> dict:
        from minio.commonconfig import ENABLE

        result = self.client.put_object(
            self.bucket,
            key,
            data,
            length=size,
            content_type=content_type,
        )
        return {"key": key, "size": size, "content_type": content_type, "etag": result.etag}

    async def download(self, key: str) -> BinaryIO:
        try:
            response = self.client.get_object(self.bucket, key)
            data = io.BytesIO(response.read())
            response.close()
            response.release_conn()
            data.seek(0)
            return data
        except S3Error as e:
            raise FileNotFoundError(f"File not found: {key}") from e

    async def delete(self, key: str) -> bool:
        try:
            self.client.remove_object(self.bucket, key)
            return True
        except S3Error:
            return False

    async def exists(self, key: str) -> bool:
        try:
            self.client.stat_object(self.bucket, key)
            return True
        except S3Error:
            return False

    async def generate_signed_url(self, key: str, expires_in: int = 300) -> str:
        try:
            url = self.client.presigned_get_object(
                self.bucket,
                key,
                expires=timedelta(seconds=expires_in),
            )
            return url
        except S3Error as e:
            raise RuntimeError(f"Failed to generate signed URL: {e}") from e

    async def get_file_info(self, key: str) -> Optional[dict]:
        try:
            stat = self.client.stat_object(self.bucket, key)
            return {
                "size": stat.size,
                "last_modified": stat.last_modified,
                "content_type": stat.content_type,
                "etag": stat.etag,
            }
        except S3Error:
            return None
