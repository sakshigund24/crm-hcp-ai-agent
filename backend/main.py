"""
HCP CRM API — FastAPI Application Entry Point

Loads settings (and therefore .env) at the very top before any other import
that might try to read environment variables. This is the correct import order
to guarantee GROQ_API_KEY is available everywhere.
"""

# ── 1. Load settings FIRST — this populates os.environ from .env ──────────────
from core.settings import settings  # noqa: E402  (intentional first import)

# ── 2. Now import everything else ──────────────────────────────────────────────
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from database.connection import init_db
from routes.interactions import router


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting HCP CRM API...")

    # Validate critical config at startup — fail fast with a clear message
    if not settings.GROQ_API_KEY:
        print(
            "\n⚠️  WARNING: GROQ_API_KEY is not set!\n"
            "   The AI chat and agent features will not work.\n"
            "   Fix: Add GROQ_API_KEY=gsk_xxxx to backend/.env and restart.\n"
        )
    else:
        masked = settings.GROQ_API_KEY[:8] + "..." + settings.GROQ_API_KEY[-4:]
        print(f"✅ Groq API key loaded: {masked}")

    await init_db()
    print("✅ Database tables ready.")
    yield
    print("👋 Shutting down HCP CRM API.")


# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="HCP CRM API",
    description="AI-First CRM for Healthcare Professional Interaction Management",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://crm-hcp-ai-agent-sandy.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(router)


# ── Health & debug endpoints ───────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "HCP CRM API",
        "version": "1.0.0",
        "groq_key_set": bool(settings.GROQ_API_KEY),
        "db_url_set": bool(settings.DATABASE_URL),
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "HCP CRM API is running.",
        "docs": "/docs",
        "health": "/health",
    }
