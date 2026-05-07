from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apitally.fastapi import ApitallyMiddleware

from app.core.config import settings
from app.modules.clients.router import router as clients_router
from app.modules.proposals.router import router as proposals_router
from app.modules.exports.router import router as exports_router
from app.modules.embeddings.router import router as embeddings_router

app = FastAPI(
    title="Smart Proposal Generator API",
    version="0.1.0",
    docs_url="/docs" if settings.environment == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.apitally_client_id:
    app.add_middleware(
        ApitallyMiddleware,
        client_id=settings.apitally_client_id,
        env=settings.environment,
    )

app.include_router(clients_router, prefix="/api/v1")
app.include_router(proposals_router, prefix="/api/v1")
app.include_router(exports_router, prefix="/api/v1")
app.include_router(embeddings_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
