from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

_settings = get_settings()
client: AsyncIOMotorClient | None = None
db = None


async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(_settings.mongodb_uri)
        db = client[_settings.mahyco_db]
        # Force an early connection attempt; otherwise motor defers and failures appear later.
        await db.command("ping")
    except Exception:
        # Allow running without MongoDB (in-memory fallback in routers).
        client = None
        db = None


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
