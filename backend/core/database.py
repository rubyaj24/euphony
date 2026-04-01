import asyncpg
from typing import AsyncGenerator
from .config import get_settings

settings = get_settings()

pool: asyncpg.Pool | None = None


async def init_db():
    global pool
    pool = await asyncpg.create_pool(
        settings.DATABASE_URL,
        min_size=2,
        max_size=10,
    )


async def close_db():
    global pool
    if pool:
        await pool.close()


async def get_db() -> AsyncGenerator[asyncpg.Pool, None]:
    if pool is None:
        await init_db()
    yield pool
