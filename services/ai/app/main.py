from fastapi import FastAPI

app = FastAPI(
    title="IPMD AI Service",
    description="AI OCR & NLP Service Skeleton",
    version="0.1.0",
)


@app.get("/health", tags=["Health Check"])
async def health_check():
    return {"status": "ok", "service": "ai"}
