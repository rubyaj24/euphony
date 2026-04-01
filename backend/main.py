from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
import sys

# FastAPI Cloud can package code as /app or /app/backend depending on deploy context.
# Add both candidates so imports like `core.*` resolve reliably.
_BASE_DIR = Path(__file__).resolve().parent
for _candidate in (_BASE_DIR, _BASE_DIR / "backend"):
    _candidate_str = str(_candidate)
    if _candidate.exists() and _candidate_str not in sys.path:
        sys.path.insert(0, _candidate_str)

try:
    from core.database import init_db, close_db
    from core.config import get_settings
    from routers import finalists, votes, admin, auth, schedule
except ModuleNotFoundError:
    from backend.core.database import init_db, close_db
    from backend.core.config import get_settings
    from backend.routers import finalists, votes, admin, auth, schedule

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Euphony API",
    description="Backend API for Euphony Voting Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(finalists.router)
app.include_router(votes.router)
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(schedule.router)


@app.get("/")
async def root():
    return {"message": "Euphony API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
