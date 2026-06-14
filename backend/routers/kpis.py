from typing import Optional
from fastapi import APIRouter, Header

from backend.services.data_service import data_service

router = APIRouter(prefix="/api/kpis", tags=["KPIs"])


@router.get("")
def get_kpis(
    x_user_email: Optional[str] = Header(None),
    x_dataset_id: Optional[str] = Header(None),
):
    """Get high-level executive KPIs."""
    kpis = data_service.get_executive_kpis(user_email=x_user_email, dataset_id=x_dataset_id)
    return {
        "success": True,
        "data": kpis,
    }
