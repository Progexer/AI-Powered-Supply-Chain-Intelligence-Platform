"""SupplyChainIQ — Dataset management router.

Handles user dataset uploads, listing, preview, and deletion.
Each user is identified by the ``X-User-Email`` header.
"""

from __future__ import annotations

import csv
import io
from typing import Optional

from fastapi import APIRouter, Header, UploadFile, File, Form, Query, HTTPException

from backend.services.workspace_service import workspace_service
from backend.services.data_service import data_service

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

# ── Helpers ──────────────────────────────────────────────────────────────────


def _require_user(user_email: str | None) -> str:
    if not user_email:
        raise HTTPException(
            status_code=401,
            detail="X-User-Email header is required to access user workspace.",
        )
    return user_email


# ── Upload ───────────────────────────────────────────────────────────────────


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_name: str = Form(""),
    dataset_type: Optional[str] = Form(None),
    x_user_email: str | None = Header(None),
):
    """Upload a CSV dataset to the user's workspace.

    The system will:
    1. Auto-detect the dataset type (shipment / inventory / supplier)
    2. Identify any missing columns
    3. Fill sensible defaults for missing columns
    4. Return a schema report telling the user what was adapted
    """
    try:
        email = _require_user(x_user_email)

        if not file.filename or not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files are supported.")

        # Read & parse CSV
        content = await file.read()
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1")

        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)

        if not rows:
            raise HTTPException(status_code=400, detail="CSV file is empty or has no valid rows.")

        # Convert numeric strings to numbers where possible
        for row in rows:
            for key, val in row.items():
                if val is None:
                    continue
                try:
                    if "." in val:
                        row[key] = float(val)
                    else:
                        row[key] = int(val)
                except (ValueError, TypeError):
                    pass  # keep as string

        name = dataset_name or file.filename or "Untitled Dataset"
        result = workspace_service.upload_dataset(
            user_email=email,
            dataset_name=name,
            file_name=file.filename or "upload.csv",
            rows=rows,
            dataset_type=dataset_type,
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return result
    except Exception as e:
        import traceback
        print("[SupplyChainIQ] ERROR inside upload_dataset router:")
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


# ── List Datasets ────────────────────────────────────────────────────────────


@router.get("")
def list_datasets(
    source: str = Query("user", regex="^(user|production)$"),
    x_user_email: str | None = Header(None),
):
    """List datasets for the user or the shared production data.

    - ``source=user`` — user's uploaded datasets
    - ``source=production`` — shared production data summaries
    """
    if source == "production":
        return {
            "source": "production",
            "datasets": [
                {
                    "name": "Model Registry",
                    "type": "models",
                    "row_count": len(data_service.get_model_registry()),
                },
                {
                    "name": "Supplier Performance Scores",
                    "type": "supplier",
                    "row_count": len(data_service.get_supplier_scores()),
                },
                {
                    "name": "Inventory Recommendations",
                    "type": "inventory",
                    "row_count": len(data_service.get_inventory_recommendations()),
                },
            ],
        }

    email = _require_user(x_user_email)
    datasets = workspace_service.list_user_datasets(email)
    return {"source": "user", "datasets": datasets}


# ── Preview Dataset ──────────────────────────────────────────────────────────


@router.get("/{dataset_id}/preview")
def preview_dataset(
    dataset_id: str,
    limit: int = Query(20, ge=1, le=100),
    x_user_email: str | None = Header(None),
):
    """Preview rows from a user's dataset with schema information."""
    email = _require_user(x_user_email)
    result = workspace_service.preview_dataset(email, dataset_id, limit)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


# ── Delete Dataset ───────────────────────────────────────────────────────────


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: str,
    x_user_email: str | None = Header(None),
):
    """Soft-delete a user's dataset."""
    email = _require_user(x_user_email)
    success = workspace_service.delete_dataset(email, dataset_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete dataset.")

    return {"status": "deleted", "dataset_id": dataset_id}


# ── Prediction History ───────────────────────────────────────────────────────


@router.get("/predictions/history")
def prediction_history(
    limit: int = Query(50, ge=1, le=200),
    x_user_email: str | None = Header(None),
):
    """Get the user's ML prediction history."""
    email = _require_user(x_user_email)
    history = workspace_service.get_prediction_history(email, limit)
    return {"user_email": email, "predictions": history}
