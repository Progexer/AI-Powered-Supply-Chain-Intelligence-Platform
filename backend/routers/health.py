"""Health and status endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
def health_check():
    """Basic health check."""
    return {"status": "healthy", "service": "SupplyChainIQ API"}
