backend/app/modules/photos/
├── __init__.py
├── router.py           # API endpoints (FastAPI router)
├── models.py           # SQLAlchemy database models
├── schemas.py          # Pydantic request/response schemas
├── service.py          # Business logic & image processing
└── storage.py          # MinIO/S3 integration


[Client Request] 
    ↓
[router.py] - Uses schemas for API validation/response
    ↓
[service.py] - Uses models to create database records
    ↓
[models.py - Photo] - SQLAlchemy saves to PostgreSQL
    ↓
[service.py] - Returns Photo object
    ↓
[router.py] - PhotoResponse schema converts to JSON
    ↓
[Client Response]