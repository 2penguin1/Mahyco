from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        protected_namespaces=("settings_",),
        extra="ignore",
    )

    # PostgreSQL
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mahyco_db"

    # File uploads
    upload_dir: str = "./uploads"

    # JWT
    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    redis_url: str = "redis://localhost:6379/0"

    # ML model
    model_api_url: str | None = None
    website_integration_dir: str | None = None

    # Debugger-style logging — set to true in .env to enable verbose terminal output
    debug_logging: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
