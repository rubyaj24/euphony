import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

dsn = os.getenv("DATABASE_URL")

async def main():
    conn = await asyncpg.connect(dsn)
    rows = await conn.fetch("SELECT key, value, updated_at FROM settings ORDER BY key")
    for r in rows:
        print(f"{r['key']}={r['value']} updated_at={r['updated_at']}")
    await conn.close()

asyncio.run(main())
