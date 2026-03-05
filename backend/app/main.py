from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import connect_db, close_db, get_db
from app.routers import analysis_router, auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    if get_db() is None:
        print("MongoDB: not connected. Auth will use in-memory store (signup/login will work without DB).")
    else:
        print("MongoDB: connected.")
    yield
    await close_db()


app = FastAPI(
    title="Mahyco API",
    description="Drone agriculture land image analysis — upload, chunk, segment, classify disease (3 classes)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api")
app.include_router(analysis_router.router, prefix="/api")


@app.get("/")
def root():
    return {"app": "Mahyco", "version": "1.0.0", "docs": "/docs"}
