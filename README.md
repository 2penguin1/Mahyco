# Mahyco

Drone agriculture land analysis platform for uploading large orthomosaic images, running single-image analysis, and processing batch jobs with a Celery worker.

## What this repo contains

- A **FastAPI** backend with JWT auth, PostgreSQL, SQLAlchemy, and Alembic migrations.
- A **React + Vite** frontend with local token storage and authenticated dashboard routes.
- An optional **local model pipeline** in `website_integration/` for YOLO + EfficientNet inference.
- Batch processing through **Celery + Redis**.

## Current stack

- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Async jobs:** Celery, Redis
- **Frontend:** React 18, Vite, TypeScript
- **Auth:** Custom JWT auth with email/password login and registration
- **Model runtime:** Optional local integration via `WEBSITE_INTEGRATION_DIR`, otherwise simulation mode

## Repository layout

```text
Mahyco/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── celery_app.py
│   │   ├── tasks.py
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   └── pages/
│   ├── public/
│   ├── package.json
│   └── README.md
├── website_integration/
├── uploads/
├── README.md
└── root legacy files such as `requirements.txt`
```

## Prerequisites

- **Python:** 3.10 or newer
- **Node.js / npm:** Node 18+ recommended
- **PostgreSQL:** reachable from the backend
- **Redis:** required for batch jobs and Celery worker state
- **Git**
- **Optional:** CUDA-capable GPU if you want to use the local model pipeline on compatible hardware

## Backend setup

All backend commands below assume you are running them from the `backend/` directory.

### 1) Create a virtual environment and install dependencies

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS / Linux
pip install --upgrade pip
pip install -r requirements.txt
```

If you are on Windows and want the local model integration, make sure the PyTorch / CUDA wheel matches your machine before installing any GPU-specific dependencies.

### 2) Configure environment variables

Copy the example file and edit `backend/.env`:

```bash
copy .env.example .env
```

Required values:

- `DATABASE_URL` - PostgreSQL connection string, for example `postgresql+asyncpg://postgres:postgres@localhost:5432/mahyco_db`
- `JWT_SECRET` - a long random secret for token signing
- `UPLOAD_DIR` - writable folder for uploads and generated reports
- `REDIS_URL` - Redis URL used by Celery, for example `redis://localhost:6379/0`

Optional values:

- `MODEL_API_URL` - external model endpoint, if you are proxying inference to another service
- `WEBSITE_INTEGRATION_DIR` - path to the local model integration folder that contains `scripts/` and `weights/`
- `DEBUG_LOGGING` - set to `true` for more verbose logs
- `ACCESS_TOKEN_EXPIRE_MINUTES` - change if you want shorter or longer JWT sessions

Important: `UPLOAD_DIR` is resolved relative to the backend process working directory unless you use an absolute path. If you start the server from `backend/`, `./uploads` becomes `backend/uploads`. If you start it from the repo root, it becomes `uploads/`.

### 3) Run database migrations

```bash
alembic upgrade head
```

### 4) Start the API server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs will be available at `http://127.0.0.1:8000/docs`.

### 5) Start the Celery worker

Batch jobs require Redis plus a Celery worker.

On Windows:

```bash
celery -A app.celery_app worker --loglevel=info --pool=solo
```

On macOS/Linux:

```bash
celery -A app.celery_app worker --loglevel=info
```

## Frontend setup

The frontend uses Vite, so the default dev server port is `5173`.

### 1) Install dependencies

```bash
cd frontend
npm install
```

### 2) Configure frontend API URL

Create `frontend/.env` if you need to override the API base URL:

```bash
VITE_API_URL=http://127.0.0.1:8000/api
```

If `VITE_API_URL` is not set, the frontend falls back to `http://127.0.0.1:8000/api`.

### 3) Start the frontend

```bash
npm run dev
```

Open the app at `http://localhost:5173`.

### 4) Optional frontend checks

```bash
npm run lint
npm run build
```

## Runtime flow

- **Auth:** users register and log in through `/api/auth/register` and `/api/auth/login`, then the frontend stores the JWT in local storage.
- **Single image analysis:** uploads hit `/api/analysis/upload` and write analysis records to PostgreSQL.
- **Batch processing:** `/api/batch/submit` scans a folder of images and dispatches a Celery task.
- **History and details:** analysis and batch routes read from the database and return JSON results for the dashboard.

## Database tables

The current ORM models are:

- `users`
- `analyses`
- `batch_jobs`

## Optional local model integration

If `WEBSITE_INTEGRATION_DIR` is set, the backend uses the local `website_integration/scripts/yolo_wrapper.py` and `website_integration/scripts/classify_wrapper.py` pipeline instead of simulation mode.

If it is not set, the backend falls back to the built-in simulation path for single-image analysis.

## Common troubleshooting

- If authentication fails, confirm `JWT_SECRET` is set and the frontend is pointing at the correct `VITE_API_URL`.
- If batch jobs never advance, make sure Redis is running and the Celery worker is alive.
- If model inference fails, verify `WEBSITE_INTEGRATION_DIR` points to a directory with the expected `scripts/` files.
- If uploads are written to the wrong folder, check the current working directory and your `UPLOAD_DIR` value.
- If you were previously following MongoDB instructions, ignore them. The current backend uses PostgreSQL, not MongoDB.

## Notes on legacy files

The repo still contains some older artifacts such as the root `requirements.txt`. The authoritative dependency set for the current backend is `backend/requirements.txt`.

---

If you want, I can also update the stale root `requirements.txt` and any old frontend docs so the rest of the repo matches this README.
