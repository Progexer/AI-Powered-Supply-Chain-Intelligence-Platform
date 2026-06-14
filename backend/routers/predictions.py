"""ML prediction endpoints — delay and demand."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from backend.services.ml_service import ml_service

from backend.services.supabase_service import supabase_service

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


class DelayPredictionRequest(BaseModel):
    """Input features for shipment delay prediction."""
    shipping_mode: str = Field(..., examples=["Standard Class"])
    order_region: str = Field(..., examples=["Western Europe"])
    category_name: str = Field(..., examples=["Cleats"])
    market: str = Field(..., examples=["Europe"])
    customer_segment: str = Field(..., examples=["Consumer"])
    department_name: str = Field(..., examples=["Fan Shop"])
    sales: float = Field(..., examples=[200.0])
    discount_rate_pct: float = Field(0.0, examples=[10.0])
    scheduled_shipping_days: int = Field(..., examples=[4])
    benefit_per_order: float = Field(0.0, examples=[20.0])
    user_email: Optional[str] = Field(None, description="Optional user email to store prediction log")


class DemandForecastRequest(BaseModel):
    """Input features for demand/sales prediction."""
    category_name: str = Field(..., examples=["Cleats"])
    order_region: str = Field(..., examples=["Western Europe"])
    market: str = Field(..., examples=["Europe"])
    shipping_mode: str = Field(..., examples=["Standard Class"])
    customer_segment: str = Field(..., examples=["Consumer"])
    department_name: str = Field(..., examples=["Fan Shop"])
    discount_rate_pct: float = Field(0.0, examples=[10.0])
    benefit_per_order: float = Field(0.0, examples=[20.0])
    scheduled_shipping_days: int = Field(4, examples=[4])
    user_email: Optional[str] = Field(None, description="Optional user email to store prediction log")


@router.post("/delay")
def predict_delay(request: DelayPredictionRequest):
    """Predict whether a shipment will be late.

    Returns prediction (0/1), label, and probability scores.
    Uses Random Forest Classifier trained on logistics shipment data.
    """
    try:
        input_data = request.model_dump()
        user_email = input_data.pop("user_email", None)
        result = ml_service.predict_delay(input_data)
        
        # Log to Supabase if connected and user_email is provided
        if user_email:
            supabase_service.save_prediction_log(user_email, "delay", input_data, result)
            
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/demand")
def predict_demand(request: DemandForecastRequest):
    """Forecast sales amount for given order features.

    Returns predicted sales in USD.
    Uses Random Forest Regressor trained on logistics shipment data.
    """
    try:
        input_data = request.model_dump()
        user_email = input_data.pop("user_email", None)
        result = ml_service.predict_demand(input_data)
        
        # Log to Supabase if connected and user_email is provided
        if user_email:
            supabase_service.save_prediction_log(user_email, "demand", input_data, result)
            
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")


@router.get("/history")
def get_prediction_history(user_email: str):
    """Retrieve all historical predictions triggered by this user email."""
    try:
        logs = supabase_service.get_prediction_logs(user_email)
        return {"success": True, "data": logs or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {str(e)}")
