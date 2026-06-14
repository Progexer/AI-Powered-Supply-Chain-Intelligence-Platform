# Schema validation and normalization logic for user file uploads
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("backend.services.schema_validator")

# Expected schemas per dataset type

SHIPMENT_SCHEMA: dict[str, Any] = {
    "shipping_mode": "Standard Class",
    "days_for_shipment_scheduled": 4,
    "days_for_shipping_real": 4,
    "order_item_discount": 0.0,
    "order_item_discount_rate": 0.0,
    "order_item_profit_ratio": 0.1,
    "order_item_quantity": 1,
    "sales": 100.0,
    "order_item_total": 100.0,
    "benefit_per_order": 10.0,
    "sales_per_customer": 100.0,
    "category_name": "Unknown",
    "customer_segment": "Consumer",
    "market": "US",
    "order_region": "Central",
}

INVENTORY_SCHEMA: dict[str, Any] = {
    "sku": "",
    "product_type": "general",
    "supplier_name": "Unknown",
    "stock_levels": 0,
    "products_sold": 0,
    "lead_time_days": 7,
    "avg_daily_demand": 0.0,
    "std_daily_demand": 0.0,
    "safety_stock": 0,
    "reorder_point": 0,
    "stockout_risk": 0,
    "reorder_qty": 0,
    "revenue_at_risk": 0.0,
}

SUPPLIER_SCHEMA: dict[str, Any] = {
    "supplier_name": "Unknown",
    "quality_score": 50.0,
    "delivery_score": 50.0,
    "cost_score": 50.0,
    "reliability_score": 50.0,
    "overall_score": 50.0,
    "risk_tier": "medium",
}

_SCHEMAS = {
    "shipment": SHIPMENT_SCHEMA,
    "inventory": INVENTORY_SCHEMA,
    "supplier": SUPPLIER_SCHEMA,
}


@dataclass
class SchemaReport:
    # Data transfer object for schema audit reports
    dataset_type: str
    columns_present: list[str] = field(default_factory=list)
    columns_missing: list[str] = field(default_factory=list)
    columns_extra: list[str] = field(default_factory=list)
    defaults_applied: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    is_usable: bool = True


def detect_dataset_type(columns: list[str]) -> str:
    # Classify dataset based on column name intersection
    col_set = {c.lower().strip() for c in columns}

    best_type = "general"
    best_score = 0.0

    for dtype, schema in _SCHEMAS.items():
        expected = {k.lower() for k in schema}
        matched = len(col_set & expected)
        if expected:
            score = matched / len(expected)
            if score > best_score:
                best_score = score
                best_type = dtype

    if best_score < 0.3:
        return "general"

    return best_type


def validate_schema(
    columns: list[str],
    dataset_type: str | None = None,
) -> SchemaReport:
    # Checks columns against expected models schema
    if dataset_type is None:
        dataset_type = detect_dataset_type(columns)

    schema = _SCHEMAS.get(dataset_type, {})
    expected_cols = set(schema.keys())
    actual_cols = {c.strip() for c in columns}

    missing = sorted(expected_cols - actual_cols)
    extra = sorted(actual_cols - expected_cols)
    present = sorted(actual_cols & expected_cols)

    defaults_applied: dict[str, Any] = {}
    warnings: list[str] = []

    for col in missing:
        default_val = schema[col]
        defaults_applied[col] = default_val

    is_usable = True

    return SchemaReport(
        dataset_type=dataset_type,
        columns_present=present,
        columns_missing=missing,
        columns_extra=extra,
        defaults_applied=defaults_applied,
        warnings=warnings,
        is_usable=is_usable,
    )


def adapt_row(
    row: dict[str, Any],
    schema_report: SchemaReport,
) -> dict[str, Any]:
    # Injects defaults for missing columns
    adapted = dict(row)
    for col, default_val in schema_report.defaults_applied.items():
        if col not in adapted or adapted[col] is None:
            adapted[col] = default_val
    return adapted


def adapt_rows(
    rows: list[dict[str, Any]],
    schema_report: SchemaReport,
) -> list[dict[str, Any]]:
    # Apply row adaptations in bulk
    return [adapt_row(r, schema_report) for r in rows]
