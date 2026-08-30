from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_v1_router

app = FastAPI(
    title="IPMD Platform API Service",
    description="Backend REST API for Intelligent Prescription & Medicine Discovery Platform (M1–M10)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for Next.js frontend (localhost:3000) and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.on_event("startup")
def ensure_db_schema():
    try:
        from app.db.session import engine
        from sqlalchemy import text
        sql_statements = [
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);",
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS context_prescription_id UUID;",
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS context_document_id UUID;",
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS context_report_id UUID;",
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS consent_record_id UUID;",
            "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ;"
        ]
        with engine.connect() as conn:
            for stmt in sql_statements:
                conn.execute(text(stmt))
            conn.commit()
    except Exception as e:
        print(f"[Schema Sync Notice]: {e}")


@app.get("/health", tags=["Health Check"])
async def health_check():
    """Health check endpoint for container and service monitoring."""
    return {"status": "ok"}