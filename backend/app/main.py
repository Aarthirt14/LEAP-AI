from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.routes import admin, auth, beneficiaries, dashboard, field_worker, interviews, outcomes, pathways, reviews, sync
from app.config import get_settings
from app.database import engine
from app.utils.errors import AppError, app_error_handler, http_error_handler, internal_error_handler, validation_error_handler

settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0", description="Transparent, deterministic livelihood decision-support API. LLMs may assist conversation and explanation but never rank final pathways.")
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(HTTPException, http_error_handler)
app.add_exception_handler(Exception, internal_error_handler)
app.add_middleware(CORSMiddleware, allow_origins=[url.strip() for url in settings.frontend_url.split(",")], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for router in [auth.router, beneficiaries.router, interviews.router, pathways.router, reviews.router, outcomes.router, field_worker.router, dashboard.router, sync.router, admin.router]:
    app.include_router(router, prefix="/api")


@app.get("/health", tags=["Health"], description="Liveness and database-connectivity check.")
def health():
    try:
        with engine.connect() as connection: connection.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected", "environment": settings.environment}
    except Exception:
        return {"status": "degraded", "database": "unavailable", "environment": settings.environment}
