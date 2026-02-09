from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import connect_db, close_db, get_db
from app.routers import auth_router, analysis_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api")
app.include_router(analysis_router.router, prefix="/api")


@app.get("/")
def root():
    return {"app": "Mahyco", "version": "1.0.0", "docs": "/docs"}
