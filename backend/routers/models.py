from fastapi import APIRouter
from backend.services.data_service import DataService

router = APIRouter(prefix="/api/models", tags=["Models"])
data_service = DataService()

@router.get("")
def get_models():
    """Get all machine learning models in the registry."""
    return data_service.get_model_registry()
