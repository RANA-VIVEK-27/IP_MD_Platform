import os

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

settings = Settings()
