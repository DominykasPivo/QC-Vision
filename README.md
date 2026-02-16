# QC Vision 🔍

**Visual Quality Tests Tracking for Modern Manufacturing**

Software Design Studio Project III - Spreadgroup Production Intelligence

## Overview

QC Vision enables QC personnel to efficiently track and manage product testing activities, document outcomes with photo evidence, and report defects with visual annotations.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite, TailwindCSS |
| Backend | Python 3.11, FastAPI |
| Database | PostgreSQL 15 |
| Storage | MinIO (S3-compatible) |
| Admin UI | NocoDB |
| Container | Docker + Docker Compose |

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd QC-Vision

# Copy environment file
cp example_env.env .env

```

### 2. Start All Services

```bash
# Build and start all containers
docker compose up --build

# Or run in detached mode (background)
docker compose up --build -d
```

### 3. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main web application |
| **Backend API** | http://localhost:8000 | REST API |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **MinIO Console** | http://localhost:9001 | Object storage admin |
| **NocoDB** | http://localhost:8080 | Database admin UI |

**MinIO Credentials:** `minioadmin` / `minioadmin123`

## Docker Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend

# Stop services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Rebuild a specific service
docker compose up --build backend
```

## Project Structure

```
QC-Vision/
├── docker-compose.yml      # Container orchestration
├── .env                    # Environment variables (create from example_env.env)
├── example_env.env         # Example environment template
├── backend/
│   ├── Dockerfile
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py         # FastAPI application
│   │   ├── database.py     # Database configuration
│   │   └── modules/        # Feature modules
│   │       ├── audit/      # Audit logging
│   │       ├── defects/    # Defect management
│   │       ├── photos/     # Photo handling
│   │       └── tests/      # QC tests
│   ├── test_suite/         # Pytest test suite
│   │   ├── integration_tests/
│   │   └── unit_tests/
│   └── tests/              # Additional tests
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx         # React application
│       ├── routes.tsx      # Route configuration
│       ├── api/            # API client
│       ├── components/     # React components
│       │   ├── annotations/
│       │   ├── layout/
│       │   └── ui/
│       ├── lib/            # Utilities and types
│       ├── mock/           # Mock data
│       └── pages/          # Page components
├── database/
│   ├── init.sql            # Database schema
│   ├── demo.sql            # Demo data
│   └── tests.sql           # Test data
└── docs/
    ├── API-spec.md
    ├── detailed_architecture.md
    ├── sprint-1-plan.md
    └── diagrams/
```

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │
│  (React)    │     │  (FastAPI)  │
│   :3000     │     │   :8000     │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │PostgreSQL│ │  MinIO   │ │  MinIO   │
        │  :5432   │ │  :9000   │ │  Console │
        │          │ │ (Storage)│ │  :9001   │
        └──────────┘ └──────────┘ └──────────┘
```

## Services

| Container | Port | Purpose |
|-----------|------|---------|
| `qc_vision_frontend` | 3000 | Vite dev server (React SPA) |
| `qc_vision_backend` | 8000 | FastAPI REST + WebSocket |
| `qc_vision_postgres` | 5432 | PostgreSQL database |
| `qc_vision_minio` | 9000, 9001 | Object storage (photos) |
| `qc_vision_nocodb` | 8080 | Database admin UI |

## MinIO (Object Storage)

MinIO provides S3-compatible object storage for photo uploads and attachments.

### Accessing MinIO Console

1. Navigate to http://localhost:9001
2. Login with credentials: `minioadmin` / `minioadmin123`

### MinIO Features

- **Buckets**: Storage containers for organizing files (e.g., `qc-photos` for defect images)
- **Object Browser**: View, upload, and download files directly
- **Access Keys**: Manage API credentials for application access

The backend automatically connects to MinIO using the credentials in `.env` to store and retrieve photos attached to QC tests and defects.

## NocoDB (Database Documentation)

NocoDB provides a spreadsheet-like interface to view and document the PostgreSQL database. It is used **for documentation purposes only** - no API keys or additional configuration required.

### Accessing NocoDB

1. Navigate to http://localhost:8080
2. Create a local account (first-time setup)
3. Connect to the database:
   - Click "New Base" → "Connect to External Database"
   - Select **PostgreSQL**
   - Use these connection details:
     - **Host**: `postgres` (Docker network name)
     - **Port**: `5432`
     - **Database**: `qc_vision`
     - **Username**: `qc_user`
     - **Password**: `qc_password_123`

### NocoDB Use Cases

- **Browse tables**: View all database tables in a familiar spreadsheet format
- **Documentation**: Understand table relationships and data structures
- **Quick lookups**: Search and filter records without writing SQL
- **Schema reference**: See column types, constraints, and relationships

> **Note**: NocoDB is a read/exploration tool for this project. All data modifications should go through the application API to maintain data integrity and audit trails.

## Development

### Backend Development

```bash
# Enter backend container
docker compose exec backend bash

# Check logs
docker compose logs -f backend
```

#### Running Tests

**Prerequisites:**
```bash
# Create virtual environment (first time only)
cd backend
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# Install dependencies including pytest
pip install -r requirements.txt
```

**All tests with coverage:**
```bash
cd backend
pytest test_suite/ --cov=app --cov-report=term
```

**Quick test run:**
```bash
pytest test_suite/ -q
```

**Unit tests only:**
```bash
pytest test_suite/unit_tests/
```

**Integration tests only:**
```bash
pytest test_suite/integration_tests/
```

### Database Access

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U qc_user -d qc_vision

# View tables
\dt

# Exit
\q
```

## Environment Variables

See [example_env.env](example_env.env) for all available configuration options.

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | qc_vision | Database name |
| `POSTGRES_USER` | qc_user | Database user |
| `POSTGRES_PASSWORD` | qc_password_123 | Database password |
| `MINIO_ACCESS_KEY` | minioadmin | MinIO access key |
| `MINIO_SECRET_KEY` | minioadmin123 | MinIO secret key |
| `DEBUG` | true | Enable debug mode |

## Troubleshooting

**Port already in use:**
```bash
# Check what's using the port
# Windows
netstat -ano | findstr :8000

# macOS/Linux
lsof -i :8000

# Stop Docker and retry
docker compose down
```

**Database connection issues:**
```bash
# Check postgres is healthy
docker compose ps
# Restart database
docker compose restart postgres
```

**Clean rebuild:**
```bash
docker compose down -v
docker compose build --no-cache
docker compose up
```

**Database Testing:**
```bash
docker compose down -v
docker compose up -d postgres

# Windows (PowerShell)
Get-Content .\database\init.sql  | docker compose exec -T postgres psql -U qc_user -d qc_vision
Get-Content .\database\demo.sql  | docker compose exec -T postgres psql -U qc_user -d qc_vision
Get-Content .\database\tests.sql | docker compose exec -T postgres psql -U qc_user -d qc_vision

# macOS/Linux
cat ./database/init.sql  | docker compose exec -T postgres psql -U qc_user -d qc_vision
cat ./database/demo.sql  | docker compose exec -T postgres psql -U qc_user -d qc_vision
cat ./database/tests.sql | docker compose exec -T postgres psql -U qc_user -d qc_vision
```


## CI (GitHub Actions)

We use a simple CI pipeline to modify the format of Python code.

### What CI checks
- **black** formatting
- **isort** import order

### Run the checks

```bash
pip install black==25.1.0 isort==5.13.2
isort backend
black backend
isort --check-only backend
black --check backend
```
### Unit Tests & Integration tests

```bash
cd backend
pytest -q
```
## Team

Production Intelligence Team - Spreadgroup

## License

MIT
