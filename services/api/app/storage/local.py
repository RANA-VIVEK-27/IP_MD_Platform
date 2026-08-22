import os
import shutil
from typing import BinaryIO, Optional
from urllib.parse import quote

from app.storage.base import StorageBackend


class LocalStorageBackend(StorageBackend):
    """Local filesystem storage backend for development."""

    def __init__(self, base_path: str = "./storage", base_url: str = "http://localhost:8000/files"):
        self.base_path = os.path.abspath(base_path)
        self.base_url = base_url
        os.makedirs(self.base_path, exist_ok=True)

    def _full_path(self, key: str) -> str:
        """Get full filesystem path, preventing path traversal."""
        safe_key = key.lstrip("/").replace("\\", "/")
        if ".." in safe_key:
            raise ValueError(f"Invalid storage key: path traversal detected")
        return os.path.join(self.base_path, safe_key)

    async def upload(self, key: str, data: BinaryIO, content_type: str = "application/octet-stream", size: int = 0) -> dict:
        full_path = self._full_path(key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, "wb") as f:
            shutil.copyfileobj(data, f)

        actual_size = os.path.getsize(full_path)
        return {"key": key, "size": actual_size, "content_type": content_type, "etag": ""}

    async def download(self, key: str) -> BinaryIO:
        full_path = self._full_path(key)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {key}")
        return open(full_path, "rb")

    async def delete(self, key: str) -> bool:
        full_path = self._full_path(key)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

    async def exists(self, key: str) -> bool:
        full_path = self._full_path(key)
        return os.path.exists(full_path)

    async def generate_signed_url(self, key: str, expires_in: int = 300) -> str:
        encoded_key = quote(key, safe="/")
        return f"{self.base_url}/{encoded_key}?token=local_dev_token&expires={expires_in}"

    async def get_file_info(self, key: str) -> Optional[dict]:
        full_path = self._full_path(key)
        if not os.path.exists(full_path):
            return None
        stat = os.stat(full_path)
        return {"size": stat.st_size, "last_modified": stat.st_mtime, "content_type": "application/octet-stream"}
