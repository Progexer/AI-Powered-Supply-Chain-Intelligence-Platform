"""SupplyChainIQ FastAPI Backend — Configuration."""

from __future__ import annotations

import os
from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API
    api_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_title: str = "SupplyChainIQ API"
    api_version: str = "1.0.0"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Paths (relative to project root)
    project_root: Path = Path(__file__).resolve().parents[1]
    models_dir: Path = project_root / "models"
    data_dir: Path = project_root / "data" / "processed"

    # CORS
    cors_origins: list[str] | str = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
