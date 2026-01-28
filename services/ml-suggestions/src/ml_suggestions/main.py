"""Main FastAPI application for ML suggestions service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ml_suggestions.handlers import ner_suggestions

app = FastAPI(
    title="Glyph ML Suggestions",
    description="ML-powered suggestion service for the Glyph annotation platform",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ner_suggestions.router, prefix="/api/v1/suggestions", tags=["suggestions"])


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy", "service": "ml-suggestions", "version": "0.1.0"}


@app.get("/")
async def root() -> dict:
    """Root endpoint."""
    return {
        "service": "Glyph ML Suggestions",
        "version": "0.1.0",
        "docs": "/docs",
    }
