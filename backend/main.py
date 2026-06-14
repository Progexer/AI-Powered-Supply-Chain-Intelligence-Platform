"""SupplyChainIQ FastAPI Backend — Main Application.

Run with:
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

API docs available at:
    http://localhost:8000/docs  (Swagger UI)
    http://localhost:8000/redoc (ReDoc)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.routers import health, predictions, suppliers, inventory, kpis, datasets, models


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load ML models on startup for fast first-request response."""
    print("[SupplyChainIQ] Loading ML models...")
    from backend.services.ml_service import ml_service
    try:
        ml_service._load_delay_model()
        ml_service._load_demand_model()
        print("[SupplyChainIQ] Models loaded successfully.")
    except Exception as e:
        print(f"[SupplyChainIQ] Warning: Could not preload models: {e}")
    yield
    print("[SupplyChainIQ] Shutting down.")


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=(
        "AI-powered supply chain intelligence API. "
        "Serves shipment delay predictions, demand forecasts, "
        "supplier scores, inventory recommendations, and executive KPIs."
    ),
    lifespan=lifespan,
)

# CORS configuration parsing
raw_origins = settings.cors_origins
parsed_origins = []
if isinstance(raw_origins, str):
    parsed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
else:
    for origin in raw_origins:
        if "," in origin:
            parsed_origins.extend([o.strip() for o in origin.split(",") if o.strip()])
        else:
            parsed_origins.append(origin.strip())

# Wildcard * check (FastAPI requires allow_credentials=False when using *)
allow_all_origins = "*" in parsed_origins or (len(parsed_origins) == 1 and parsed_origins[0] == "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else parsed_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(predictions.router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(kpis.router)
app.include_router(datasets.router)
app.include_router(models.router)


@app.get("/", tags=["Root"])
def root():
    """API root — service info."""
    return {
        "service": settings.api_title,
        "version": settings.api_version,
        "docs": "/docs",
        "endpoints": {
            "health": "/api/health",
            "delay_prediction": "POST /api/predictions/delay",
            "demand_forecast": "POST /api/predictions/demand",
            "suppliers": "/api/suppliers",
            "inventory": "/api/inventory",
            "at_risk_skus": "/api/inventory/at-risk",
            "kpis": "/api/kpis",
            "models": "/api/models",
            "datasets_upload": "POST /api/datasets/upload",
            "datasets_list": "GET /api/datasets?source=user|production",
            "datasets_preview": "GET /api/datasets/{id}/preview",
        },
    }
