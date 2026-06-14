from typing import Optional
from fastapi import APIRouter, HTTPException, Header

from backend.services.data_service import data_service

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


@router.get("")
def list_inventory(
    x_user_email: Optional[str] = Header(None),
    x_dataset_id: Optional[str] = Header(None),
):
    """List all inventory recommendations.

    Supports user workspace isolation if X-User-Email and X-Dataset-Id headers are present.
    """
    recs = data_service.get_inventory_recommendations(user_email=x_user_email, dataset_id=x_dataset_id)
    return {
        "success": True,
        "count": len(recs),
        "data": recs,
    }


@router.get("/at-risk")
def list_at_risk_skus(
    x_user_email: Optional[str] = Header(None),
    x_dataset_id: Optional[str] = Header(None),
):
    """Get inventory recommendations for SKUs currently at stockout risk."""
    recs = data_service.get_at_risk_skus(user_email=x_user_email, dataset_id=x_dataset_id)
    return {
        "success": True,
        "count": len(recs),
        "data": recs,
    }


@router.get("/{sku}")
def get_inventory_by_sku(
    sku: str,
    x_user_email: Optional[str] = Header(None),
    x_dataset_id: Optional[str] = Header(None),
):
    """Get inventory metrics for a specific SKU."""
    rec = data_service.get_inventory_by_sku(sku, user_email=x_user_email, dataset_id=x_dataset_id)
    if rec is None:
        raise HTTPException(status_code=404, detail=f"Inventory record for SKU '{sku}' not found")
    return {"success": True, "data": rec}
