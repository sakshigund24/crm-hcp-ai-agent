"""
Central settings — loads .env from the backend directory (or parent).
Import `settings` anywhere in the app instead of calling os.getenv() directly.
This guarantees the .env is loaded exactly once before anything else runs.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/crm_hcp"

    # ── Groq ──────────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""

    # ── App ───────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"
    APP_ENV: str = "development"

    model_config = SettingsConfigDict(
        # Look for .env in the backend folder first, then one level up
        env_file=(
            str(Path(__file__).resolve().parent.parent / ".env"),  # backend/.env
            str(Path(__file__).resolve().parent.parent.parent / ".env"),  # root .env
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Singleton — import this everywhere
settings = Settings()
