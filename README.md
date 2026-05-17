## Setup (Full)
**Prerequisites:**
- **Python:** 3.10 or newer
- **Node.js / npm:** Node 18+ recommended (or Bun / pnpm)
- **Git**
- **(Optional GPU)**: CUDA 12.4 for GPU builds — if you need GPU-enabled PyTorch, use the provided `torch_cu124.whl` or install the correct wheel for your system.
**1) Backend (FastAPI)**
- Create and activate a virtual environment, then install Python dependencies:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS / Linux
pip install --upgrade pip
pip install -r requirements.txt
- If you want to use the included CUDA PyTorch wheel (only for compatible GPUs/OS):

```bash
# from repository root
cd backend
pip install ../torch_cu124.whl
- Copy and edit environment variables:

```bash
cp .env.example .env
# Edit backend/.env and set at minimum: MONGODB_URI, MAHYCO_DB, UPLOAD_DIR, JWT_SECRET
- Run DB migrations (if needed) and start the API:

```bash
# run migrations (requires alembic in your env)
alembic upgrade head

```bash
# start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs will be available at `http://localhost:8000/docs`.
**2) Frontend (Vite + React)**

- Install and run the frontend (use `npm` here since `package-lock.json` is provided):

```bash
cd frontend
npm install
npm run dev
```
- The app will be served at `http://localhost:3000` by default.
**3) Models, Weights & Integration**

- Model weights and example artifacts may be present at the repository root (e.g. `best.pt`, `efficientnet_b4_A4000_final.pth`) or under `frontend/weights/`. The backend looks for uploads in the path configured by `UPLOAD_DIR` in `backend/.env` (see `.env.example`).
- If you have external model integration, set `WEBSITE_INTEGRATION_DIR` or `MODEL_API_URL` in `backend/.env`.

**4) Common commands**

- Run backend tests (if present):
```bash
cd backend
pytest
```
- Lint / typecheck frontend:
```bash
cd frontend
npm run lint
```

**5) Troubleshooting & notes**
- If you see import errors for Torch or mismatched CUDA, remove any local wheel installs and install CPU-only `torch` (or the correct wheel for your platform).
- Large model weights are intentionally excluded from Git. Keep them outside of version control or store them in an artifact store / cloud bucket.

---

If you'd like, I can also add a small `scripts/` helper for creating the venv and installing requirements, or generate a concise `CONTRIBUTING.md` with these commands.
# Mahyco – Drone Agriculture Land Analysis

**New to this project?** → **[docs/START_HERE.md](docs/START_HERE.md)** – step-by-step from MongoDB Compass to running the app.

Full-stack app for **Mahyco**: upload large drone agriculture images, chunk/segment them, and classify disease into three classes (healthy, mild infection, severe infection). Includes authentication (user + company), analysis report tabs, download, and history.

## Stack

- **Frontend:** React (Vite), HTML, CSS
- **Backend:** FastAPI, MongoDB (Motor)
- **Auth:** JWT (user and company roles)

## Quick start

### 1. MongoDB

Ensure MongoDB is running (local or Atlas). Set `MONGODB_URI` in backend `.env`.

- **Local:** `MONGODB_URI=mongodb://localhost:27017`
- **Atlas:** use the connection string from your cluster (see **[docs/MONGODB_SETUP.md](docs/MONGODB_SETUP.md)** for step-by-step setup).

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env     # edit .env with MONGODB_URI, JWT_SECRET
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### 4. Environment

- **Backend** (`backend/.env`): `MONGODB_URI`, `MAHYCO_DB`, `JWT_SECRET`, `UPLOAD_DIR`
- **Frontend** (`frontend/.env`): `VITE_API_URL=http://localhost:8000/api`

## Features

- **Auth:** Register / login as **User** or **Company** (company name optional for company accounts).
- **Upload:** Drag-and-drop or browse to upload a drone agriculture image (max 50MB).
- **Analysis:** Backend simulates cropping into chunks, segmentation, and 3-class disease classification (healthy / mild_infection / severe_infection). Replace `image_service.simulate_chunk_and_classify` with your real model later.
- **Report:** Tabs for summary and chunk-level details; overall health score and class counts.
- **Download:** Download full analysis report as JSON.
- **History:** List past analyses; open report or download from history.

## Project layout

```
Mahyco/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── auth.py
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── context/AuthContext.jsx
│   │   ├── components/
│   │   ├── pages/
│   │   └── index.css
│   └── package.json
└── README.md
```

## Pushing to GitHub

1. **Create a new repository** on GitHub (do not add a README or .gitignore).

2. **Initial commit** (if you haven’t yet):
   ```bash
   git add .
   git commit -m "Initial commit: Mahyco drone agriculture analysis app"
   ```

3. **Add remote and push**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

4. **Security:** Never commit `backend/.env` or `frontend/.env` — they are in `.gitignore`. Use `.env.example` as a template and set real values locally or in GitHub Secrets for CI.

---

## Replacing the simulator with real models

In `backend/app/services/image_service.py`:

1. **Chunking:** Use your real logic to split the image into tiles (e.g. 256×256).
2. **Classification:** Call your classifier per chunk and map outputs to `healthy` / `mild_infection` / `severe_infection`.
3. Keep the same `ChunkResult` and summary structure so the API and frontend stay unchanged.
