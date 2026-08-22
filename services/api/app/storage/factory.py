from app.core.config import settings
from app.storage.base import StorageBackend


def get_storage_backend() -> StorageBackend:
    """
    Factory function to get the configured storage backend.
    Returns LocalStorageBackend or MinIOStorageBackend based on STORAGE_PROVIDER.
    """
    provider = settings.STORAGE_PROVIDER.lower()

    if provider == "minio":
        from app.storage.minio import MinIOStorageBackend
        return MinIOStorageBackend()
    else:
        from app.storage.local import LocalStorageBackend
        return LocalStorageBackend(
            base_path=settings.STORAGE_LOCAL_PATH,
            base_url="http://localhost:8000/files",
        )


_storage_instance: StorageBackend = None


def get_storage() -> StorageBackend:
    """Get cached storage backend singleton."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = get_storage_backend()
    return _storage_instance
