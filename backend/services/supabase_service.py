# Supabase connection and operations wrapper
from __future__ import annotations

import logging
from typing import Any

from supabase import create_client, Client
from backend.config import get_settings

logger = logging.getLogger("backend.services.supabase_service")
_settings = get_settings()


class SupabaseService:
    # Client interface with local CSV fallbacks

    def __init__(self) -> None:
        self.client: Client | None = None
        self.is_connected = False
        self._init_client()

    def _init_client(self) -> None:
        # Configures connection using env credentials
        if _settings.supabase_url and _settings.supabase_service_role_key:
            try:
                self.client = create_client(_settings.supabase_url, _settings.supabase_service_role_key)
                self.is_connected = True
                logger.info("Successfully connected to Supabase live instance.")
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase client: {e}")
                self.is_connected = False
        else:
            logger.info("Supabase credentials missing or incomplete. Running in offline/local fallback mode.")
            self.is_connected = False

    def get_suppliers(self) -> list[dict[str, Any]] | None:
        # Fetch seeded supplier scorecard data
        if not self.is_connected or not self.client:
            return None
        try:
            response = self.client.table("supplier_performance_scores").select(
                "*, dim_suppliers(supplier_name, country, region)"
            ).execute()
            
            # Load local fallback supplier mapping just in case
            import pandas as pd
            local_map = {}
            try:
                path = _settings.models_dir / "supplier_scores.csv"
                if path.exists():
                    df = pd.read_csv(path)
                    for _, row in df.iterrows():
                        name = row["supplier_name"]
                        code = name.replace(" ", "_").lower()
                        local_map[code] = {
                            "supplier_name": name,
                            "country": "USA" if "1" in name or "3" in name else "Germany",
                            "region": "Americas" if "1" in name or "3" in name else "Europe"
                        }
            except Exception as ex:
                logger.warning(f"Error loading supplier csv fallback: {ex}")

            data = []
            for row in (response.data or []):
                flat_row = {**row}
                
                # Check PostgREST join first
                supplier_info = row.get("dim_suppliers")
                if isinstance(supplier_info, dict) and supplier_info.get("supplier_name"):
                    flat_row["supplier_name"] = supplier_info.get("supplier_name")
                    flat_row["country"] = supplier_info.get("country")
                    flat_row["region"] = supplier_info.get("region")
                
                # Ensure fields are present
                if not flat_row.get("supplier_name"):
                    try:
                        res_s = self.client.table("dim_suppliers").select("supplier_name, country, region").eq("supplier_id", row.get("supplier_id")).execute()
                        if res_s.data:
                            s = res_s.data[0]
                            flat_row["supplier_name"] = s.get("supplier_name")
                            flat_row["country"] = s.get("country")
                            flat_row["region"] = s.get("region")
                    except Exception:
                        pass
                
                if not flat_row.get("supplier_name"):
                    flat_row["supplier_name"] = "Unknown Supplier"
                    flat_row["country"] = "Unknown"
                    flat_row["region"] = "Unknown"

                data.append(flat_row)
            return data
        except Exception as e:
            logger.error(f"Error fetching suppliers from Supabase: {e}")
            return None

    def get_inventory(self) -> list[dict[str, Any]] | None:
        # Fetch seeded inventory recommendations
        if not self.is_connected or not self.client:
            return None
        try:
            response = self.client.table("inventory_recommendations").select(
                "*, dim_products(sku, product_name, category, unit_cost)"
            ).execute()
            
            # Load local CSV mapping to get supplier name and lead time for SKUs
            import pandas as pd
            csv_map = {}
            try:
                path = _settings.models_dir / "inventory_recommendations.csv"
                if path.exists():
                    df = pd.read_csv(path)
                    for _, row in df.iterrows():
                        sku = str(row["sku"])
                        csv_map[sku] = {
                            "supplier_name": row.get("supplier_name", "Unknown Supplier"),
                            "lead_time_days": int(row.get("lead_time_days", 10))
                        }
            except Exception as ex:
                logger.warning(f"Error loading inventory CSV fallback map: {ex}")

            data = []
            for row in (response.data or []):
                flat_row = {**row}
                
                # Check joined dim_products
                prod_info = row.get("dim_products")
                sku = None
                if isinstance(prod_info, dict):
                    sku = prod_info.get("sku")
                    flat_row["sku"] = sku
                    flat_row["product_type"] = prod_info.get("category")
                    flat_row["unit_cost"] = prod_info.get("unit_cost")
                
                if not flat_row.get("sku"):
                    flat_row["sku"] = "Unknown SKU"
                    flat_row["product_type"] = "Unknown"
                    flat_row["unit_cost"] = 10.0
                
                # Map database keys to frontend expected CSV keys
                flat_row["stock_levels"] = row.get("current_stock")
                flat_row["reorder_qty"] = row.get("recommended_order_quantity")
                
                # Calculate daily demand (forecasted_demand is monthly, so divide by 30)
                fd = row.get("forecasted_demand")
                if fd is not None:
                    flat_row["avg_daily_demand"] = round(float(fd) / 30.0, 2)
                else:
                    flat_row["avg_daily_demand"] = 20.0
                
                # Lookup supplier and lead time from CSV map using SKU
                if sku and sku in csv_map:
                    flat_row["supplier_name"] = csv_map[sku]["supplier_name"]
                    flat_row["lead_time_days"] = csv_map[sku]["lead_time_days"]
                else:
                    flat_row["supplier_name"] = "Unknown Supplier"
                    flat_row["lead_time_days"] = 10

                data.append(flat_row)
            return data
        except Exception as e:
            logger.error(f"Error fetching inventory recommendations from Supabase: {e}")
            return None

    def get_model_registry(self) -> list[dict[str, Any]] | None:
        # Get active model configurations
        if not self.is_connected or not self.client:
            return None
        try:
            response = self.client.table("model_registry").select("*").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching model registry from Supabase: {e}")
            return None

    def save_prediction_log(self, user_email: str, prediction_type: str, input_features: dict[str, Any], output_result: dict[str, Any]) -> bool:
        # Save prediction payload for logging/audit
        if not self.is_connected or not self.client:
            return False
        try:
            self.client.table("user_prediction_results").insert({
                "user_email": user_email,
                "prediction_type": prediction_type,
                "input_features": input_features,
                "output_result": output_result
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error logging prediction to Supabase: {e}")
            return False

    def get_prediction_logs(self, user_email: str) -> list[dict[str, Any]] | None:
        # Fetch past logs for user dashboard
        if not self.is_connected or not self.client:
            return None
        try:
            response = self.client.table("user_prediction_results").select("*").eq("user_email", user_email).order("created_at", desc=True).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching prediction logs from Supabase: {e}")
            return None

# Singleton
supabase_service = SupabaseService()
