from fastapi import FastAPI

app = FastAPI(
    title="IPMD API Service",
    description="Backend REST API for Intelligent Prescription & Medicine Discovery Platform",
    version="0.1.0",
)


@app.get("/health", tags=["Health Check"])
async def health_check():
    """Health check endpoint for container and service monitoring."""
    return {"status": "ok"}
