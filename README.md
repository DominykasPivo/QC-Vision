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
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

### 3. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost | Main web application |
| **Backend API** | http://localhost:8000 | REST API |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **MinIO Console** | http://localhost:9001 | Object storage admin |

**MinIO Credentials:** `minioadmin` / `minioadmin123`

## Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Rebuild a specific service
docker-compose up --build backend
```

## Project Structure

```
QC-Vision/
├── docker-compose.yml      # Container orchestration
├── .env                    # Environment variables (create from example_env.env)
├── example_env.env         # Example environment template
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       └── main.py         # FastAPI application
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       └── App.jsx         # React application
├── database/
│   └── init.sql            # Database schema
└── docs/
    ├── API-spec.md
    └── detailed_architecture.md
```

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │
│  (React)    │     │  (FastAPI)  │
│   :80       │     │   :8000     │
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
| `qc_vision_frontend` | 80 | Nginx serving React SPA |
| `qc_vision_backend` | 8000 | FastAPI REST + WebSocket |
| `qc_vision_postgres` | 5432 | PostgreSQL database |
| `qc_vision_minio` | 9000, 9001 | Object storage (photos) |
| `qc_vision_minio_init` | - | Bucket initialization (exits) |

## Development

### Backend Development

```bash
# Enter backend container
docker-compose exec backend bash

# Run tests
pytest

# Check logs
docker-compose logs -f backend
```

### Frontend Development

For hot-reload development (outside Docker):

```bash
cd frontend
npm install
npm run dev  # Runs on localhost:3000
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U qc_user -d qc_vision

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
netstat -ano | findstr :8000
# Stop Docker and retry
docker-compose down
```

**Database connection issues:**
```bash
# Check postgres is healthy
docker-compose ps
# Restart database
docker-compose restart postgres
```

**Clean rebuild:**
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## Team

Production Intelligence Team - Spreadgroup

## License

MIT
