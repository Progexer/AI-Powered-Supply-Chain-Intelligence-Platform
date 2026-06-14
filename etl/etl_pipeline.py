# ETL pipeline to ingest and clean raw supply chain data
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RAW_DIR = ROOT / "data" / "raw"
DEFAULT_PROCESSED_DIR = ROOT / "data" / "processed"


DATASET1_COLUMN_MAP = {
    "Type": "payment_type",
    "Days for shipping (real)": "actual_shipping_days",
    "Days for shipment (scheduled)": "scheduled_shipping_days",
    "Benefit per order": "benefit_per_order",
    "Sales per customer": "sales_per_customer",
    "Delivery Status": "delivery_status",
    "Late_delivery_risk": "late_delivery_risk",
    "Category Id": "category_id",
    "Category Name": "category_name",
    "Customer City": "customer_city",
    "Customer Country": "customer_country",
    "Customer Email": "customer_email",
    "Customer Fname": "customer_first_name",
    "Customer Id": "customer_id",
    "Customer Lname": "customer_last_name",
    "Customer Password": "customer_password",
    "Customer Segment": "customer_segment",
    "Customer State": "customer_state",
    "Customer Street": "customer_street",
    "Customer Zipcode": "customer_zipcode",
    "Department Id": "department_id",
    "Department Name": "department_name",
    "Latitude": "latitude",
    "Longitude": "longitude",
    "Market": "market",
    "Order City": "order_city",
    "Order Country": "order_country",
    "Order Customer Id": "order_customer_id",
    "order date (DateOrders)": "order_date",
    "Order Id": "order_id",
    "Order Item Cardprod Id": "order_item_cardprod_id",
    "Order Item Discount": "order_item_discount",
    "Order Item Discount Rate": "order_item_discount_rate",
    "Order Item Id": "order_item_id",
    "Order Item Product Price": "order_item_product_price",
    "Order Item Profit Ratio": "order_item_profit_ratio",
    "Order Item Quantity": "order_item_quantity",
    "Sales": "sales",
    "Order Item Total": "order_item_total",
    "Order Profit Per Order": "order_profit_per_order",
    "Order Region": "order_region",
    "Order State": "order_state",
    "Order Status": "order_status",
    "Order Zipcode": "order_zipcode",
    "Product Card Id": "product_card_id",
    "Product Category Id": "product_category_id",
    "Product Description": "product_description",
    "Product Image": "product_image",
    "Product Name": "product_name",
    "Product Price": "product_price",
    "Product Status": "product_status",
    "shipping date (DateOrders)": "shipping_date",
    "Shipping Mode": "shipping_mode",
}


DATASET2_COLUMN_MAP = {
    "Product type": "product_type",
    "SKU": "sku",
    "Price": "product_price",
    "Availability": "availability",
    "Number of products sold": "products_sold",
    "Revenue generated": "revenue_generated",
    "Customer demographics": "customer_demographics",
    "Stock levels": "stock_levels",
    "Lead times": "source_lead_time_days",
    "Order quantities": "order_quantities",
    "Shipping times": "shipping_times",
    "Shipping carriers": "shipping_carrier",
    "Shipping costs": "shipping_cost",
    "Supplier name": "supplier_name",
    "Location": "supplier_location",
    "Lead time": "manufacturing_lead_time_days",
    "Production volumes": "production_volumes",
    "Manufacturing lead time": "manufacturing_process_lead_time_days",
    "Manufacturing costs": "manufacturing_costs",
    "Inspection results": "inspection_result",
    "Defect rates": "defect_rate_raw",
    "Transportation modes": "transportation_mode",
    "Routes": "route",
    "Costs": "total_costs",
}


SENSITIVE_DATASET1_COLUMNS = [
    "customer_email",
    "customer_password",
    "customer_first_name",
    "customer_last_name",
    "customer_street",
    "product_description",
    "product_image",
]


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, encoding="latin-1")


def clean_strings(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    for column in result.select_dtypes(include=["object", "string"]).columns:
        result[column] = (
            result[column]
            .astype("string")
            .str.strip()
            .replace({"": pd.NA, "nan": pd.NA, "None": pd.NA})
        )
    return result


def rename_columns(df: pd.DataFrame, mapping: dict[str, str]) -> pd.DataFrame:
    return df.rename(columns=mapping)


def to_nullable_int_string(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce").round().astype("Int64")
    return numeric.astype("string")


def parse_datetime_series(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", format="%m/%d/%Y %H:%M")


def safe_ratio(numerator: pd.Series, denominator: pd.Series, multiplier: float = 1.0) -> pd.Series:
    denom = pd.to_numeric(denominator, errors="coerce")
    num = pd.to_numeric(numerator, errors="coerce")
    return np.where(denom != 0, (num / denom) * multiplier, np.nan)


def clean_dataset1(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = rename_columns(raw.copy(), DATASET1_COLUMN_MAP)
    df = clean_strings(df)

    numeric_columns = [
        "actual_shipping_days",
        "scheduled_shipping_days",
        "benefit_per_order",
        "sales_per_customer",
        "late_delivery_risk",
        "category_id",
        "customer_id",
        "customer_zipcode",
        "department_id",
        "latitude",
        "longitude",
        "order_customer_id",
        "order_id",
        "order_item_cardprod_id",
        "order_item_discount",
        "order_item_discount_rate",
        "order_item_id",
        "order_item_product_price",
        "order_item_profit_ratio",
        "order_item_quantity",
        "sales",
        "order_item_total",
        "order_profit_per_order",
        "order_zipcode",
        "product_card_id",
        "product_category_id",
        "product_price",
        "product_status",
    ]
    for column in numeric_columns:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    for column in ["order_date", "shipping_date"]:
        if column in df.columns:
            df[column] = parse_datetime_series(df[column])

    for column in ["customer_zipcode", "order_zipcode"]:
        if column in df.columns:
            df[column] = to_nullable_int_string(df[column])

    cleaned = df.drop(columns=[c for c in SENSITIVE_DATASET1_COLUMNS if c in df.columns])

    cleaned["delivery_delay_days"] = cleaned["actual_shipping_days"] - cleaned["scheduled_shipping_days"]
    cleaned["shipping_ahead_days"] = cleaned["scheduled_shipping_days"] - cleaned["actual_shipping_days"]
    cleaned["late_delivery_flag"] = cleaned["late_delivery_risk"].fillna(0).astype("Int64")
    cleaned["is_profitable_flag"] = (cleaned["benefit_per_order"] > 0).astype("Int64")
    cleaned["profit_margin_pct"] = safe_ratio(cleaned["benefit_per_order"], cleaned["sales"], multiplier=100)
    cleaned["discount_rate_pct"] = pd.to_numeric(cleaned["order_item_discount_rate"], errors="coerce") * 100
    cleaned["order_month"] = cleaned["order_date"].dt.month.astype("Int64")
    cleaned["order_weekday"] = cleaned["order_date"].dt.day_name().astype("string")
    cleaned["shipping_month"] = cleaned["shipping_date"].dt.month.astype("Int64")
    cleaned["shipping_weekday"] = cleaned["shipping_date"].dt.day_name().astype("string")
    cleaned["customer_zipcode_missing"] = cleaned["customer_zipcode"].isna().astype("Int64")
    cleaned["order_zipcode_missing"] = cleaned["order_zipcode"].isna().astype("Int64")

    features = cleaned[
        [
            "order_id",
            "order_item_id",
            "product_card_id",
            "customer_id",
            "order_date",
            "shipping_date",
            "actual_shipping_days",
            "scheduled_shipping_days",
            "delivery_delay_days",
            "shipping_ahead_days",
            "late_delivery_flag",
            "benefit_per_order",
            "sales",
            "profit_margin_pct",
            "order_item_discount_rate",
            "discount_rate_pct",
            "customer_segment",
            "market",
            "order_region",
            "order_status",
            "shipping_mode",
            "product_name",
            "category_name",
            "department_name",
        ]
    ].copy()

    return cleaned, features


def clean_dataset2(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = rename_columns(raw.copy(), DATASET2_COLUMN_MAP)
    df = clean_strings(df)

    numeric_columns = [
        "product_price",
        "availability",
        "products_sold",
        "revenue_generated",
        "stock_levels",
        "source_lead_time_days",
        "order_quantities",
        "shipping_times",
        "shipping_cost",
        "manufacturing_lead_time_days",
        "production_volumes",
        "manufacturing_process_lead_time_days",
        "manufacturing_costs",
        "defect_rate_raw",
        "total_costs",
    ]
    for column in numeric_columns:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    cleaned = df.copy()
    cleaned["defect_rate_out_of_range_flag"] = (cleaned["defect_rate_raw"] > 1).astype("Int64")
    cleaned["quality_pass_flag"] = cleaned["inspection_result"].eq("Pass").astype("Int64")
    cleaned["quality_fail_flag"] = cleaned["inspection_result"].eq("Fail").astype("Int64")
    cleaned["inventory_gap"] = cleaned["availability"] - cleaned["stock_levels"]
    cleaned["sell_through_rate"] = safe_ratio(cleaned["products_sold"], cleaned["stock_levels"], multiplier=1.0)
    cleaned["revenue_per_unit_sold"] = safe_ratio(cleaned["revenue_generated"], cleaned["products_sold"], multiplier=1.0)
    cleaned["shipping_cost_per_unit"] = safe_ratio(cleaned["shipping_cost"], cleaned["order_quantities"], multiplier=1.0)
    cleaned["manufacturing_cost_per_unit"] = safe_ratio(cleaned["manufacturing_costs"], cleaned["production_volumes"], multiplier=1.0)
    cleaned["lead_time_gap_days"] = cleaned["source_lead_time_days"] - cleaned["manufacturing_lead_time_days"]
    cleaned["supply_pressure_index"] = safe_ratio(cleaned["products_sold"], cleaned["availability"], multiplier=1.0)

    features = cleaned[
        [
            "sku",
            "product_type",
            "supplier_name",
            "supplier_location",
            "product_price",
            "availability",
            "products_sold",
            "revenue_generated",
            "stock_levels",
            "inventory_gap",
            "sell_through_rate",
            "source_lead_time_days",
            "manufacturing_lead_time_days",
            "lead_time_gap_days",
            "shipping_times",
            "shipping_cost",
            "shipping_cost_per_unit",
            "production_volumes",
            "manufacturing_costs",
            "manufacturing_cost_per_unit",
            "inspection_result",
            "defect_rate_raw",
            "defect_rate_out_of_range_flag",
            "quality_pass_flag",
            "quality_fail_flag",
            "transportation_mode",
            "route",
        ]
    ].copy()

    return cleaned, features


def summarise_dataset1(df: pd.DataFrame) -> dict[str, Any]:
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "duplicate_rows": int(df.duplicated().sum()),
        "product_description_nulls": int(df["Product Description"].isna().sum()) if "Product Description" in df.columns else None,
        "order_zipcode_nulls": int(df["Order Zipcode"].isna().sum()) if "Order Zipcode" in df.columns else None,
        "late_delivery_count": int((pd.to_numeric(df["Late_delivery_risk"], errors="coerce") == 1).sum()) if "Late_delivery_risk" in df.columns else None,
    }


def summarise_dataset2(df: pd.DataFrame) -> dict[str, Any]:
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "duplicate_rows": int(df.duplicated().sum()),
        "defect_rate_out_of_range_count": int((pd.to_numeric(df["Defect rates"], errors="coerce") > 1).sum()) if "Defect rates" in df.columns else None,
        "pending_inspection_count": int(df["Inspection results"].eq("Pending").sum()) if "Inspection results" in df.columns else None,
    }


def write_csv(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def run_pipeline(raw_dir: Path = DEFAULT_RAW_DIR, processed_dir: Path = DEFAULT_PROCESSED_DIR) -> dict[str, Any]:
    dataset1_path = raw_dir / "Dataset1.csv"
    dataset2_path = raw_dir / "Dataset2.csv"

    dataset1_raw = load_csv(dataset1_path)
    dataset2_raw = load_csv(dataset2_path)

    dataset1_clean, dataset1_features = clean_dataset1(dataset1_raw)
    dataset2_clean, dataset2_features = clean_dataset2(dataset2_raw)

    processed_dir.mkdir(parents=True, exist_ok=True)
    write_csv(dataset1_clean, processed_dir / "supplychainiq_dataset1_clean.csv")
    write_csv(dataset2_clean, processed_dir / "supplychainiq_dataset2_clean.csv")
    write_csv(dataset1_features, processed_dir / "supplychainiq_dataset1_features.csv")
    write_csv(dataset2_features, processed_dir / "supplychainiq_dataset2_features.csv")

    validation_report = {
        "dataset1": summarise_dataset1(dataset1_raw),
        "dataset2": summarise_dataset2(dataset2_raw),
        "notes": [
            "Dataset 1 customer and product PII are removed from the clean output.",
            "Dataset 2 defect_rate_raw is preserved as-is because the unit is unresolved.",
            "Dataset 2 values above 1.0 are flagged but not normalized to avoid inventing a scale.",
        ],
    }

    with (processed_dir / "data_validation_report.json").open("w", encoding="utf-8") as f:
        json.dump(validation_report, f, indent=2, ensure_ascii=False, default=str)

    return validation_report


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the SupplyChainIQ ETL pipeline.")
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR, help="Directory containing raw CSV inputs.")
    parser.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR, help="Directory for cleaned outputs.")
    return parser


def main() -> int:
    args = build_arg_parser().parse_args()
    report = run_pipeline(args.raw_dir, args.processed_dir)
    print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
