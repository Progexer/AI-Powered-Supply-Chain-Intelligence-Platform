"""SupplyChainIQ — Database Seed Script.

This script parses output CSV/JSON files and seeds the live Supabase database.
Requirements:
    pip install supabase pandas python-dotenv

Run with:
    python supabase/seed_supabase.py
"""

from __future__ import annotations

import os
import json
from pathlib import Path
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set in your .env file.")
    exit(1)

print(f"Connecting to Supabase at: {SUPABASE_URL}")
client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def _resolve_model_type(model_name: str) -> str:
    """Map a model name to a valid model_type enum value in the database.

    Valid enum values: demand_forecast, delay_prediction, supplier_scoring,
    inventory_optimization, recommendation.
    """
    name = model_name.lower()
    if "delay" in name:
        return "delay_prediction"
    if "demand" in name or "forecast" in name:
        return "demand_forecast"
    if "supplier" in name or "score" in name:
        return "supplier_scoring"
    if "inventory" in name or "optim" in name:
        return "inventory_optimization"
    return "recommendation"


def _normalize_risk_tier(raw: str) -> str:
    """Normalize CSV risk tier labels to valid risk_level enum values.

    Valid enum values: low, medium, high, critical.
    Handles inputs like 'Low Risk', 'High Risk', 'Medium', etc.
    """
    first_word = str(raw).strip().split()[0].lower()
    valid = {"low", "medium", "high", "critical"}
    return first_word if first_word in valid else "medium"


def seed_model_registry():
    """Seed the model registry table."""
    print("\n--- Seeding Model Registry ---")
    registry_path = PROJECT_ROOT / "models" / "model_registry.json"
    if not registry_path.exists():
        print(f"File not found: {registry_path}")
        return {}

    with open(registry_path, encoding="utf-8") as f:
        models = json.load(f)

    model_name_to_id = {}
    for m in models:
        # Check if model already exists
        res = client.table("model_registry").select("model_id").eq("model_name", m["model_name"]).eq("version", m["model_version"]).execute()
        if res.data:
            model_id = res.data[0]["model_id"]
            print(f"Model {m['model_name']} v{m['model_version']} already exists: {model_id}")
            model_name_to_id[m["model_name"]] = model_id
            continue

        payload = {
            "model_name": m["model_name"],
            "model_type": _resolve_model_type(m["model_name"]),
            "version": m["model_version"],
            "target_variable": m["target_column"],
            "algorithm": m["algorithm"],
            "metrics": m["metrics"],
            "artifact_path": m["artifact_path"],
            "is_active": True,
            "training_start_date": "2026-06-10",
            "training_end_date": "2026-06-11"
        }
        res_ins = client.table("model_registry").insert(payload).execute()
        if res_ins.data:
            model_id = res_ins.data[0]["model_id"]
            print(f"Inserted model {m['model_name']}: {model_id}")
            model_name_to_id[m["model_name"]] = model_id

    return model_name_to_id


def seed_suppliers_and_scores(model_id_map):
    """Seed dim_suppliers and supplier_performance_scores tables."""
    print("\n--- Seeding Suppliers and Scores (Optimized Bulk) ---")
    supplier_path = PROJECT_ROOT / "models" / "supplier_scores.csv"
    if not supplier_path.exists():
        print(f"File not found: {supplier_path}")
        return {}

    df = pd.read_csv(supplier_path)
    model_id = model_id_map.get("supplier_performance_scorer")

    # Fetch existing suppliers
    res_s = client.table("dim_suppliers").select("supplier_id, supplier_code").execute()
    existing_suppliers = {s["supplier_code"]: s["supplier_id"] for s in (res_s.data or [])}

    new_suppliers = []
    for _, row in df.iterrows():
        s_name = row["supplier_name"]
        s_code = s_name.replace(" ", "_").lower()
        if s_code not in existing_suppliers:
            new_suppliers.append({
                "supplier_code": s_code,
                "supplier_name": s_name,
                "country": "USA" if "1" in s_name or "3" in s_name else "Germany",
                "region": "Americas" if "1" in s_name or "3" in s_name else "Europe",
                "default_lead_time_days": 10,
                "contract_status": "active",
                "is_active": True
            })

    if new_suppliers:
        res_ins = client.table("dim_suppliers").insert(new_suppliers).execute()
        if res_ins.data:
            for s in res_ins.data:
                existing_suppliers[s["supplier_code"]] = s["supplier_id"]

    supplier_name_to_id = {}
    for _, row in df.iterrows():
        s_name = row["supplier_name"]
        s_code = s_name.replace(" ", "_").lower()
        supplier_name_to_id[s_name] = existing_suppliers.get(s_code)

    # Fetch existing scores for date 2026-06-11
    res_scores = client.table("supplier_performance_scores").select("supplier_id").eq("score_date", "2026-06-11").execute()
    existing_scores = {s["supplier_id"] for s in (res_scores.data or [])}

    new_scores = []
    for _, row in df.iterrows():
        s_name = row["supplier_name"]
        s_id = supplier_name_to_id.get(s_name)
        if s_id and s_id not in existing_scores:
            new_scores.append({
                "model_id": model_id,
                "supplier_id": s_id,
                "score_date": "2026-06-11",
                "quality_score": float(row["quality_score"]),
                "delivery_score": float(row["delivery_score"]),
                "cost_score": float(row["cost_score"]),
                "reliability_score": float(row["reliability_score"]),
                "overall_score": float(row["overall_score"]),
                "risk_tier": _normalize_risk_tier(row["risk_tier"]),
                "explanation": {"notes": "Initial seed scorecard"}
            })

    if new_scores:
        client.table("supplier_performance_scores").insert(new_scores).execute()
        print(f"Bulk inserted {len(new_scores)} supplier scorecards.")

    return supplier_name_to_id


def seed_products_and_inventory(model_id_map, supplier_map):
    """Seed dim_products and inventory_recommendations tables."""
    print("\n--- Seeding Products and Inventory Recommendations (Optimized Bulk) ---")
    inv_path = PROJECT_ROOT / "models" / "inventory_recommendations.csv"
    if not inv_path.exists():
        print(f"File not found: {inv_path}")
        return

    df = pd.read_csv(inv_path)
    model_id = model_id_map.get("inventory_optimizer")

    # Ensure location exists in dim_locations (default seed location)
    loc_code = "central_wh"
    res_loc = client.table("dim_locations").select("location_id").eq("location_code", loc_code).execute()
    if res_loc.data:
        loc_id = res_loc.data[0]["location_id"]
        print(f"Central warehouse location exists: {loc_id}")
    else:
        payload_loc = {
            "location_code": loc_code,
            "location_name": "Central Warehouse",
            "location_type": "warehouse",
            "country": "USA",
            "region": "Americas",
            "is_active": True
        }
        res_ins = client.table("dim_locations").insert(payload_loc).execute()
        loc_id = res_ins.data[0]["location_id"]
        print(f"Inserted central warehouse location: {loc_id}")

    # Fetch existing products
    res_p = client.table("dim_products").select("product_id, sku").execute()
    product_sku_to_id = {p["sku"]: p["product_id"] for p in (res_p.data or [])}

    new_products = []
    seen_skus = set()
    for _, row in df.iterrows():
        sku = str(row["sku"])
        p_type = row["product_type"]
        if sku not in product_sku_to_id and sku not in seen_skus:
            seen_skus.add(sku)
            new_products.append({
                "sku": sku,
                "product_name": f"{p_type} (SKU: {sku})",
                "category": p_type,
                "unit_cost": float(row["unit_cost"]) if "unit_cost" in df.columns else 10.0,
                "unit_price": float(row["unit_cost"] * 1.5) if "unit_cost" in df.columns else 15.0,
                "is_active": True
            })

    if new_products:
        res_ins = client.table("dim_products").insert(new_products).execute()
        if res_ins.data:
            for p in res_ins.data:
                product_sku_to_id[p["sku"]] = p["product_id"]

    # Fetch existing recommendations for date 2026-06-11
    res_recs = client.table("inventory_recommendations").select("product_id").eq("location_id", loc_id).eq("recommendation_date", "2026-06-11").execute()
    existing_recs = {r["product_id"] for r in (res_recs.data or [])}

    new_recs = []
    for _, row in df.iterrows():
        sku = str(row["sku"])
        p_id = product_sku_to_id.get(sku)
        if p_id and p_id not in existing_recs:
            new_recs.append({
                "model_id": model_id,
                "product_id": p_id,
                "location_id": loc_id,
                "recommendation_date": "2026-06-11",
                "current_stock": int(row["stock_levels"]),
                "forecasted_demand": float(row["avg_daily_demand"] * 30),
                "reorder_point": int(row["reorder_point"]),
                "recommended_order_quantity": int(row["reorder_qty"]),
                "safety_stock": int(row["safety_stock"]),
                "priority": "high" if row["stockout_risk"] == 1 else "low",
                "status": "open",
                "rationale": f"Current stock {row['stock_levels']} is {'below' if row['stockout_risk'] == 1 else 'above'} reorder point {row['reorder_point']}."
            })

    if new_recs:
        chunk_size = 500
        for i in range(0, len(new_recs), chunk_size):
            client.table("inventory_recommendations").insert(new_recs[i:i+chunk_size]).execute()
        print(f"Bulk inserted {len(new_recs)} inventory recommendations.")


def main():
    print("Starting SupplyChainIQ database seeding...")
    model_id_map = seed_model_registry()
    supplier_map = seed_suppliers_and_scores(model_id_map)
    seed_products_and_inventory(model_id_map, supplier_map)
    print("\nDatabase seeding completed successfully.")


if __name__ == "__main__":
    main()
