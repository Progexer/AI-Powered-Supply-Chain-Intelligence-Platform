from typing import Optional
from fastapi import APIRouter, HTTPException, Header

from backend.services.data_service import data_service

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.get("")
def list_suppliers(
    x_user_email: Optional[str] = Header(None),
    x_dataset_id: Optional[str] = Header(None),
):
    """List all supplier performance scores and risk tiers.

    Uses weighted composite performance scoring metrics.
    Supports user workspace isolation if X-User-Email and X-Dataset-Id headers are present.
    """
    scores = data_service.get_supplier_scores(user_email=x_user_email, dataset_id=x_dataset_id)
    return {
        "success": True,
        "count": len(scores),
        "data": scores,
    }


@router.get("/{supplier_name}")
def get_supplier(
    supplier_name: str,
    x_user_email: Optional[str] = Header(None),
    x_dataset_id: Optional[str] = Header(None),
):
    """Get performance details for a specific supplier."""
    supplier = data_service.get_supplier_by_name(supplier_name, user_email=x_user_email, dataset_id=x_dataset_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail=f"Supplier '{supplier_name}' not found")
    return {"success": True, "data": supplier}
