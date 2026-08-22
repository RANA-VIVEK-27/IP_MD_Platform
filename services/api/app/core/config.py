import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "ipmd_admin")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "ipmd_secret")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5434")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "ipmd_db")

    @property
    def DATABASE_URL(self) -> str:
        url = os.getenv("DATABASE_URL")
        if url:
            return url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "super-secret-ipmd-jwt-key-2026-secure-bytes")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    OTP_EXPIRE_SECONDS: int = int(os.getenv("OTP_EXPIRE_SECONDS", "300"))

    # Razorpay Integration (Test/Live)
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_ipmd2026mockkey")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "mock_razorpay_secret_key_2026")

    # Storage Configuration (MinIO / S3-compatible)
    STORAGE_PROVIDER: str = os.getenv("STORAGE_PROVIDER", "local")  # "local" or "minio"
    STORAGE_ENDPOINT: str = os.getenv("STORAGE_ENDPOINT", "localhost:9000")
    STORAGE_ACCESS_KEY: str = os.getenv("STORAGE_ACCESS_KEY", "minioadmin")
    STORAGE_SECRET_KEY: str = os.getenv("STORAGE_SECRET_KEY", "minioadmin123")
    STORAGE_BUCKET: str = os.getenv("STORAGE_BUCKET", "ipmd-documents")
    STORAGE_REGION: str = os.getenv("STORAGE_REGION", "us-east-1")
    STORAGE_USE_SSL: bool = os.getenv("STORAGE_USE_SSL", "false").lower() == "true"
    STORAGE_LOCAL_PATH: str = os.getenv("STORAGE_LOCAL_PATH", "./storage")
    STORAGE_SIGNED_URL_EXPIRES: int = int(os.getenv("STORAGE_SIGNED_URL_EXPIRES", "300"))

    # File Upload Validation
    UPLOAD_MAX_SIZE_BYTES: int = int(os.getenv("UPLOAD_MAX_SIZE_MB", "20")) * 1024 * 1024
    UPLOAD_ALLOWED_EXTENSIONS: str = os.getenv("UPLOAD_ALLOWED_EXTENSIONS", "jpg,jpeg,png,pdf")
    UPLOAD_ALLOWED_MIME_TYPES: str = os.getenv(
        "UPLOAD_ALLOWED_MIME_TYPES",
        "image/jpeg,image/jpg,image/png,application/pdf"
    )

    # Malware Scanning
    MALWARE_SCANNER_ENABLED: bool = os.getenv("MALWARE_SCANNER_ENABLED", "false").lower() == "true"
    MALWARE_SCANNER_TIMEOUT: int = int(os.getenv("MALWARE_SCANNER_TIMEOUT", "30"))

    # Celery
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

    @property
    def UPLOAD_ALLOWED_EXTENSIONS_SET(self) -> set:
        return set(self.UPLOAD_ALLOWED_EXTENSIONS.split(","))

    @property
    def UPLOAD_ALLOWED_MIME_TYPES_SET(self) -> set:
        return set(self.UPLOAD_ALLOWED_MIME_TYPES.split(","))


settings = Settings()
