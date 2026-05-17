"""
Async SQLAlchemy engine + session factory for PostgreSQL.

Usage:
    from app.database import get_session

    async def my_endpoint(session: AsyncSession = Depends(get_session)):
        ...
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import get_settings

_settings = get_settings()

engine = create_async_engine(
    _settings.database_url,
    echo=False,       # Set True to log all SQL
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_session() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency that yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        yield session
