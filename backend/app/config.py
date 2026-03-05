from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        protected_namespaces=("settings_",),
        extra="ignore",
    )
    mongodb_uri: str = "mongodb://localhost:27017"
    mahyco_db: str = "mahyco_db"
    upload_dir: str = "./uploads"
    clerk_jwks_url: str | None = None
    clerk_secret_key: str | None = None
    model_api_url: str | None = None
    website_integration_dir: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
