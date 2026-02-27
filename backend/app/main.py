"""
QC Vision - Main FastAPI Application
Visual Quality Tests Tracking for Modern Manufacturing
"""

import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_tables
from app.modules.audit.router import router as audit_router
from app.modules.defects.router import router as defects_router
from app.modules.photos.router import router as photos_router
from app.modules.tests.router import router as tests_router
from app.routers import users  # adjust if your structure differs

# Application metadata
APP_NAME = "QC Vision API"
APP_VERSION = "0.1.0"
APP_DESCRIPTION = """
QC Vision - Visual Quality Tests Tracking for Modern Manufacturing

## Features
- 📸 Photo Capture & Upload
- 🧪 Quality Test Management
- 🔍 Defect Documentation
- 📊 Audit & Review
- 🤖 AI-Assisted Design Recognition (Optional)
"""

logger = logging.getLogger("backend_photos_main")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    print(f"🚀 Starting {APP_NAME} v{APP_VERSION}")
    print("📊 Creating database tables...")
    create_tables()
    print("✅ Database tables ready")
    yield
    print(f"👋 Shutting down {APP_NAME}")


# Create FastAPI application
app = FastAPI(
    title=APP_NAME,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker and load balancers."""
    return {
        "status": "healthy",
        "service": APP_NAME,
        "version": APP_VERSION,
    }


@app.get("/api/v1/status")
async def api_status():
    """API status endpoint."""
    return {
        "api_version": "v1",
        "status": "operational",
        "services": {
            "test_management": "available",
            "photo_management": "available",
            "defect_documentation": "available",
            "audit_review": "available",
            "ai_recognition": "coming_soon",
        },
    }


# ✅ Mount all module routers under /api/v1
# Each module router is responsible for its own sub-prefix (/tests, /photos, /defects, /audit)
app.include_router(tests_router, prefix="/api/v1")
app.include_router(photos_router, prefix="/api/v1")
app.include_router(defects_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")

# keep users router if you have it
app.include_router(users.router, prefix="/api/v1")
