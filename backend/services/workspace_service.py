# User workspace service for managing isolated datasets and predictions in Supabase
from __future__ import annotations

import logging
from typing import Any

from backend.services.supabase_service import supabase_service
from backend.services.schema_validator import (
    validate_schema,
    adapt_rows,
    SchemaReport,
)

logger = logging.getLogger("backend.services.workspace_service")


class WorkspaceService:
    # Operations for dataset uploads, list, preview, and tracking predictions

    # Dataset Upload

    def upload_dataset(
        self,
        user_email: str,
        dataset_name: str,
        file_name: str,
        rows: list[dict[str, Any]],
        dataset_type: str | None = None,
    ) -> dict[str, Any]:
        # Uploads, validates, and batch inserts user dataset
        if not rows:
            return {"error": "No data rows provided."}

        columns = list(rows[0].keys())
        report = validate_schema(columns, dataset_type)

        # Store metadata
        dataset_meta = {
            "user_email": user_email,
            "dataset_name": dataset_name,
            "dataset_type": report.dataset_type,
            "file_name": file_name,
            "row_count": len(rows),
            "columns": columns,
            "missing_columns": report.columns_missing,
            "schema_warnings": report.warnings,
            "is_active": True,
        }

        # Adapt rows (fill defaults for missing columns)
        adapted_rows = adapt_rows(rows, report)

        # Try Supabase first
        dataset_id = None
        if supabase_service.is_connected and supabase_service.client:
            try:
                res = supabase_service.client.table("user_datasets").insert(dataset_meta).execute()
                if res.data:
                    dataset_id = res.data[0]["dataset_id"]

                    # Insert rows in batches of 3000
                    batch_size = 3000
                    for i in range(0, len(adapted_rows), batch_size):
                        batch = [
                            {
                                "dataset_id": dataset_id,
                                "row_number": i + j + 1,
                                "payload": row,
                            }
                            for j, row in enumerate(adapted_rows[i : i + batch_size])
                        ]
                        supabase_service.client.table("user_dataset_records").insert(batch).execute()

                    logger.info(
                        f"Uploaded dataset '{dataset_name}' for {user_email}: "
                        f"{len(rows)} rows, {len(report.columns_missing)} missing cols adapted"
                    )
            except Exception as e:
                print(f"[SupplyChainIQ] ERROR during upload_dataset: {e}")
                logger.error(f"Error uploading dataset to Supabase: {e}")
                return {"error": str(e)}
        else:
            return {"error": "Database not connected. Cannot store user datasets in offline mode."}

        return {
            "dataset_id": dataset_id,
            "dataset_name": dataset_name,
            "dataset_type": report.dataset_type,
            "row_count": len(rows),
            "columns_present": report.columns_present,
            "columns_missing": report.columns_missing,
            "columns_extra": report.columns_extra,
            "defaults_applied": report.defaults_applied,
            "warnings": report.warnings,
            "is_usable": report.is_usable,
        }

    # List Datasets

    def list_user_datasets(self, user_email: str) -> list[dict[str, Any]]:
        # Fetch active datasets metadata
        if not supabase_service.is_connected or not supabase_service.client:
            return []
        try:
            res = (
                supabase_service.client.table("user_datasets")
                .select("dataset_id, dataset_name, dataset_type, file_name, row_count, columns, missing_columns, schema_warnings, is_active, created_at")
                .eq("user_email", user_email)
                .eq("is_active", True)
                .order("created_at", desc=True)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.error(f"Error listing datasets for {user_email}: {e}")
            return []

    def get_dataset_metadata(self, user_email: str, dataset_id: str) -> dict[str, Any] | None:
        # Get metadata for a single dataset
        if not supabase_service.is_connected or not supabase_service.client:
            return None
        try:
            res = (
                supabase_service.client.table("user_datasets")
                .select("dataset_id, dataset_name, dataset_type, file_name, row_count")
                .eq("dataset_id", dataset_id)
                .eq("user_email", user_email)
                .execute()
            )
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Error fetching dataset metadata {dataset_id}: {e}")
            return None

    # Preview Dataset

    def preview_dataset(
        self,
        user_email: str,
        dataset_id: str,
        limit: int = 20,
    ) -> dict[str, Any]:
        # Preview first n rows of a dataset
        if not supabase_service.is_connected or not supabase_service.client:
            return {"error": "Database not connected."}

        try:
            meta_res = (
                supabase_service.client.table("user_datasets")
                .select("*")
                .eq("dataset_id", dataset_id)
                .eq("user_email", user_email)
                .execute()
            )
            if not meta_res.data:
                return {"error": "Dataset not found or access denied."}

            meta = meta_res.data[0]

            rows_res = (
                supabase_service.client.table("user_dataset_records")
                .select("row_number, payload")
                .eq("dataset_id", dataset_id)
                .order("row_number")
                .limit(limit)
                .execute()
            )
            rows = [r["payload"] for r in (rows_res.data or [])]

            return {
                "dataset_id": dataset_id,
                "dataset_name": meta["dataset_name"],
                "dataset_type": meta["dataset_type"],
                "row_count": meta["row_count"],
                "columns": meta["columns"],
                "missing_columns": meta["missing_columns"],
                "schema_warnings": meta["schema_warnings"],
                "preview_rows": rows,
            }
        except Exception as e:
            logger.error(f"Error previewing dataset {dataset_id}: {e}")
            return {"error": str(e)}

    # Fetch Full Dataset (for ML predictions)

    def get_dataset_rows(
        self,
        user_email: str,
        dataset_id: str,
    ) -> list[dict[str, Any]] | None:
        # Retrieve all payloads for custom prediction runs
        if not supabase_service.is_connected or not supabase_service.client:
            return None

        try:
            meta_res = (
                supabase_service.client.table("user_datasets")
                .select("dataset_id")
                .eq("dataset_id", dataset_id)
                .eq("user_email", user_email)
                .execute()
            )
            if not meta_res.data:
                return None

            rows_res = (
                supabase_service.client.table("user_dataset_records")
                .select("payload")
                .eq("dataset_id", dataset_id)
                .order("row_number")
                .execute()
            )
            return [r["payload"] for r in (rows_res.data or [])]
        except Exception as e:
            logger.error(f"Error fetching dataset rows {dataset_id}: {e}")
            return None

    # Save Prediction Result

    def save_prediction_result(
        self,
        user_email: str,
        dataset_id: str | None,
        prediction_type: str,
        input_summary: dict[str, Any],
        output_result: dict[str, Any],
        columns_used: list[str],
        columns_defaulted: dict[str, Any],
    ) -> bool:
        # Log prediction result
        if not supabase_service.is_connected or not supabase_service.client:
            return False
        try:
            supabase_service.client.table("user_prediction_results").insert({
                "user_email": user_email,
                "dataset_id": dataset_id,
                "prediction_type": prediction_type,
                "input_summary": input_summary,
                "output_result": output_result,
                "columns_used": columns_used,
                "columns_defaulted": columns_defaulted,
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving prediction result: {e}")
            return False

    # Prediction History

    def get_prediction_history(
        self,
        user_email: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        # Fetch audit log of predictions
        if not supabase_service.is_connected or not supabase_service.client:
            return []
        try:
            res = (
                supabase_service.client.table("user_prediction_results")
                .select("*")
                .eq("user_email", user_email)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching prediction history: {e}")
            return []

    # Delete Dataset

    def delete_dataset(self, user_email: str, dataset_id: str) -> bool:
        # Soft delete dataset meta
        if not supabase_service.is_connected or not supabase_service.client:
            return False
        try:
            supabase_service.client.table("user_datasets").update(
                {"is_active": False}
            ).eq("dataset_id", dataset_id).eq("user_email", user_email).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting dataset: {e}")
            return False


# Service instance
workspace_service = WorkspaceService()
