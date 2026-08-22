from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class StorageBackend(ABC):
    """Provider-independent storage abstraction interface."""

    @abstractmethod
    async def upload(self, key: str, data: BinaryIO, content_type: str = "application/octet-stream", size: int = 0) -> dict:
        """
        Upload a file to storage.

        Args:
            key: Storage key (path) for the file.
            data: File-like object with binary data.
            content_type: MIME type of the file.
            size: File size in bytes.

        Returns:
            dict with storage metadata (key, size, etag, etc.)
        """
        ...

    @abstractmethod
    async def download(self, key: str) -> BinaryIO:
        """
        Download a file from storage.

        Args:
            key: Storage key (path) for the file.

        Returns:
            File-like object with binary data.
        """
        ...

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """
        Delete a file from storage.

        Args:
            key: Storage key (path) for the file.

        Returns:
            True if deleted, False if not found.
        """
        ...

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """
        Check if a file exists in storage.

        Args:
            key: Storage key (path) for the file.

        Returns:
            True if file exists, False otherwise.
        """
        ...

    @abstractmethod
    async def generate_signed_url(self, key: str, expires_in: int = 300) -> str:
        """
        Generate a short-lived signed URL for secure download.

        Args:
            key: Storage key (path) for the file.
            expires_in: URL expiration time in seconds (default 300s = 5 min).

        Returns:
            Signed URL string.
        """
        ...

    @abstractmethod
    async def get_file_info(self, key: str) -> Optional[dict]:
        """
        Get file metadata without downloading the file.

        Args:
            key: Storage key (path) for the file.

        Returns:
            dict with file info (size, content_type, last_modified) or None.
        """
        ...
