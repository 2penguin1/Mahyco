from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

_settings = get_settings()
client: AsyncIOMotorClient | None = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(_settings.mongodb_uri)
    db = client[_settings.mahyco_db]


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
