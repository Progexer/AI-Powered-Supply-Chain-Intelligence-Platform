"""SupplyChainIQ Machine Learning Pipeline.

Trains four models:
1. Shipment Delay Predictor (Random Forest Classifier)
2. Demand Forecaster (Random Forest Regressor)
3. Supplier Performance Scorer (Weighted Composite)
4. Inventory Optimizer (Analytical Formulas)

Run from project root:
    python models/ml_pipeline.py
"""

from __future__ import annotations

import json
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    f1_score, mean_absolute_error, mean_squared_error,
    precision_score, r2_score, recall_score, roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore", category=FutureWarning)

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
MODELS = ROOT / "models"
EVAL = MODELS / "evaluation_reports"
EVAL.mkdir(parents=True, exist_ok=True)

TIMESTAMP = datetime.now(timezone.utc).isoformat(timespec="seconds")
MODEL_REGISTRY: list[dict] = []


def encode_categoricals(df: pd.DataFrame, cols: list[str]) -> tuple[pd.DataFrame, dict[str, LabelEncoder]]:
    """Label-encode categorical columns. Returns encoded df and encoder dict."""
    result = df.copy()
    encoders = {}
    for col in cols:
        le = LabelEncoder()
        result[col] = result[col].astype(str).fillna("UNKNOWN")
        result[col] = le.fit_transform(result[col])
        encoders[col] = le
    return result, encoders


def safe_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """MAPE that handles zero actuals."""
    mask = y_true != 0
    if mask.sum() == 0:
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def register_model(name: str, version: str, algorithm: str, metrics: dict,
                    artifact_path: str, target: str) -> None:
    MODEL_REGISTRY.append({
        "model_name": name,
        "model_version": version,
        "algorithm": algorithm,
        "metrics": metrics,
        "artifact_path": artifact_path,
        "target_column": target,
        "trained_at": TIMESTAMP,
        "status": "active",
    })


def train_delay_predictor(d1: pd.DataFrame) -> dict:
    """Train Random Forest Classifier for late delivery prediction."""
    print("\n" + "=" * 60)
    print("MODEL 1: Shipment Delay Predictor")
    print("=" * 60)

    feature_cols = [
        "shipping_mode", "order_region", "category_name", "market",
        "customer_segment", "department_name",
        "sales", "discount_rate_pct", "scheduled_shipping_days",
        "benefit_per_order",
    ]
    cat_cols = ["shipping_mode", "order_region", "category_name", "market",
                "customer_segment", "department_name"]
    target = "late_delivery_flag"

    df = d1[feature_cols + [target]].dropna(subset=[target]).copy()
    df[target] = df[target].astype(int)
    df, encoders = encode_categoricals(df, cat_cols)
    df[feature_cols] = df[feature_cols].apply(pd.to_numeric, errors="coerce").fillna(0)

    X = df[feature_cols]
    y = df[target]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"  Train: {len(X_train):,} | Test: {len(X_test):,}")
    print(f"  Class balance: {y.value_counts(normalize=True).to_dict()}")

    model = RandomForestClassifier(
        n_estimators=200, max_depth=15, min_samples_split=10,
        random_state=42, n_jobs=-1, class_weight="balanced",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred), 4),
        "recall": round(recall_score(y_test, y_pred), 4),
        "f1_score": round(f1_score(y_test, y_pred), 4),
        "roc_auc": round(roc_auc_score(y_test, y_proba), 4),
    }

    print("\n  Results:")
    for k, v in metrics.items():
        print(f"    {k}: {v}")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["On-Time", "Late"]))

    # Save model
    model_path = MODELS / "delay_predictor.joblib"
    joblib.dump({"model": model, "encoders": encoders, "feature_cols": feature_cols}, model_path)
    print(f"  Saved: {model_path.name}")

    # Feature importance chart
    importance = pd.Series(model.feature_importances_, index=feature_cols).sort_values()
    fig, ax = plt.subplots(figsize=(9, 6))
    importance.plot(kind="barh", ax=ax, color="#2563eb")
    ax.set_title("Delay Predictor: Feature Importance", fontsize=13)
    ax.set_xlabel("Importance")
    fig.tight_layout()
    fig.savefig(EVAL / "delay_predictor_feature_importance.png", dpi=160)
    plt.close(fig)

    # Confusion matrix chart
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, cmap="Blues")
    for i in range(2):
        for j in range(2):
            ax.text(j, i, f"{cm[i, j]:,}", ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black", fontsize=14)
    ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
    ax.set_xticklabels(["On-Time", "Late"]); ax.set_yticklabels(["On-Time", "Late"])
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
    ax.set_title("Delay Predictor: Confusion Matrix")
    fig.colorbar(im)
    fig.tight_layout()
    fig.savefig(EVAL / "delay_predictor_confusion_matrix.png", dpi=160)
    plt.close(fig)

    register_model("delay_predictor", "1.0", "RandomForestClassifier",
                    metrics, "models/delay_predictor.joblib", target)
    return metrics


def train_demand_forecaster(d1: pd.DataFrame) -> dict:
    """Train Random Forest Regressor for sales prediction."""
    print("\n" + "=" * 60)
    print("MODEL 2: Demand Forecaster")
    print("=" * 60)

    feature_cols = [
        "category_name", "order_region", "market", "shipping_mode",
        "customer_segment", "department_name",
        "discount_rate_pct", "benefit_per_order",
        "scheduled_shipping_days",
    ]
    cat_cols = ["category_name", "order_region", "market", "shipping_mode",
                "customer_segment", "department_name"]
    target = "sales"

    df = d1[feature_cols + [target]].dropna(subset=[target]).copy()
    df, encoders = encode_categoricals(df, cat_cols)
    df[feature_cols] = df[feature_cols].apply(pd.to_numeric, errors="coerce").fillna(0)

    X = df[feature_cols]
    y = df[target]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"  Train: {len(X_train):,} | Test: {len(X_test):,}")
    print(f"  Target stats: mean={y.mean():.2f}, std={y.std():.2f}")

    model = RandomForestRegressor(
        n_estimators=200, max_depth=15, min_samples_split=10,
        random_state=42, n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae = float(mean_absolute_error(y_test, y_pred))
    r2 = float(r2_score(y_test, y_pred))
    mape = safe_mape(y_test.values, y_pred)

    metrics = {
        "rmse": round(rmse, 4),
        "mae": round(mae, 4),
        "r2": round(r2, 4),
        "mape_pct": round(mape, 2),
    }

    print("\n  Results:")
    for k, v in metrics.items():
        print(f"    {k}: {v}")

    # Save model
    model_path = MODELS / "demand_forecaster.joblib"
    joblib.dump({"model": model, "encoders": encoders, "feature_cols": feature_cols}, model_path)
    print(f"  Saved: {model_path.name}")

    # Feature importance chart
    importance = pd.Series(model.feature_importances_, index=feature_cols).sort_values()
    fig, ax = plt.subplots(figsize=(9, 6))
    importance.plot(kind="barh", ax=ax, color="#0f766e")
    ax.set_title("Demand Forecaster: Feature Importance", fontsize=13)
    ax.set_xlabel("Importance")
    fig.tight_layout()
    fig.savefig(EVAL / "demand_forecaster_feature_importance.png", dpi=160)
    plt.close(fig)

    # Actual vs Predicted scatter
    sample_idx = np.random.RandomState(42).choice(len(y_test), size=min(2000, len(y_test)), replace=False)
    fig, ax = plt.subplots(figsize=(7, 7))
    ax.scatter(y_test.values[sample_idx], y_pred[sample_idx], alpha=0.3, s=10, color="#0f766e")
    lim = max(y_test.values[sample_idx].max(), y_pred[sample_idx].max())
    ax.plot([0, lim], [0, lim], "r--", lw=1.5, label="Perfect prediction")
    ax.set_xlabel("Actual Sales ($)"); ax.set_ylabel("Predicted Sales ($)")
    ax.set_title("Demand Forecaster: Actual vs Predicted")
    ax.legend()
    fig.tight_layout()
    fig.savefig(EVAL / "demand_forecaster_actual_vs_predicted.png", dpi=160)
    plt.close(fig)

    register_model("demand_forecaster", "1.0", "RandomForestRegressor",
                    metrics, "models/demand_forecaster.joblib", target)
    return metrics


def score_suppliers(d2: pd.DataFrame) -> dict:
    """Compute weighted composite supplier scores."""
    print("\n" + "=" * 60)
    print("MODEL 3: Supplier Performance Scorer")
    print("=" * 60)

    WEIGHTS = {"quality": 0.30, "delivery": 0.25, "cost": 0.25, "reliability": 0.20}

    suppliers = d2.groupby("supplier_name").agg(
        total_skus=("sku", "count"),
        pass_rate=("quality_pass_flag", "mean"),
        fail_rate=("quality_fail_flag", "mean"),
        avg_defect=("defect_rate_raw", "mean"),
        avg_lead_time_gap=("lead_time_gap_days", "mean"),
        lead_time_std=("lead_time_gap_days", "std"),
        avg_mfg_cost=("manufacturing_cost_per_unit", "mean"),
        avg_ship_cost=("shipping_cost_per_unit", "mean"),
        avg_sell_through=("sell_through_rate", "mean"),
        avg_stock=("stock_levels", "mean"),
        avg_sold=("products_sold", "mean"),
    ).reset_index()
    suppliers["lead_time_std"] = suppliers["lead_time_std"].fillna(0)

    def normalize(s: pd.Series, invert: bool = False) -> pd.Series:
        rng = s.max() - s.min()
        if rng == 0:
            return pd.Series(50.0, index=s.index)
        normed = (s - s.min()) / rng * 100
        return 100 - normed if invert else normed

    suppliers["quality_score"] = (
        normalize(suppliers["pass_rate"]) * 0.6 +
        normalize(suppliers["avg_defect"], invert=True) * 0.4
    )
    suppliers["delivery_score"] = normalize(suppliers["avg_lead_time_gap"], invert=True)
    suppliers["cost_score"] = normalize(
        suppliers["avg_mfg_cost"] + suppliers["avg_ship_cost"], invert=True
    )
    suppliers["reliability_score"] = normalize(suppliers["lead_time_std"], invert=True)

    suppliers["overall_score"] = (
        suppliers["quality_score"] * WEIGHTS["quality"] +
        suppliers["delivery_score"] * WEIGHTS["delivery"] +
        suppliers["cost_score"] * WEIGHTS["cost"] +
        suppliers["reliability_score"] * WEIGHTS["reliability"]
    ).round(2)

    suppliers["risk_tier"] = pd.cut(
        suppliers["overall_score"],
        bins=[-1, 40, 70, 101],
        labels=["High Risk", "Medium Risk", "Low Risk"],
    )

    suppliers = suppliers.sort_values("overall_score", ascending=False)
    out_path = MODELS / "supplier_scores.csv"
    suppliers.to_csv(out_path, index=False)

    print("\n  Supplier Scorecard:")
    for _, row in suppliers.iterrows():
        print(f"    {row['supplier_name']:20s} | Score: {row['overall_score']:5.1f} | {row['risk_tier']}")
        print(f"      Quality: {row['quality_score']:.1f} | Delivery: {row['delivery_score']:.1f} "
              f"| Cost: {row['cost_score']:.1f} | Reliability: {row['reliability_score']:.1f}")
    print(f"\n  Saved: {out_path.name}")

    # Chart
    fig, ax = plt.subplots(figsize=(10, 6))
    colors = {"Low Risk": "#22c55e", "Medium Risk": "#f59e0b", "High Risk": "#ef4444"}
    bar_colors = [colors.get(str(t), "#888") for t in suppliers["risk_tier"]]
    ax.barh(suppliers["supplier_name"], suppliers["overall_score"], color=bar_colors)
    ax.set_xlabel("Overall Score"); ax.set_title("Supplier Performance Scores", fontsize=13)
    ax.set_xlim(0, 100)
    for i, (_, row) in enumerate(suppliers.iterrows()):
        ax.text(row["overall_score"] + 1, i, f"{row['overall_score']:.0f} ({row['risk_tier']})", va="center")
    fig.tight_layout()
    fig.savefig(EVAL / "supplier_scores_chart.png", dpi=160)
    plt.close(fig)

    # Component breakdown chart
    comp_cols = ["quality_score", "delivery_score", "cost_score", "reliability_score"]
    fig, ax = plt.subplots(figsize=(10, 6))
    x = np.arange(len(suppliers))
    width = 0.2
    for i, col in enumerate(comp_cols):
        ax.bar(x + i * width, suppliers[col].values, width, label=col.replace("_", " ").title())
    ax.set_xticks(x + width * 1.5)
    ax.set_xticklabels(suppliers["supplier_name"], rotation=15, ha="right")
    ax.set_ylabel("Score"); ax.set_title("Supplier Score Breakdown", fontsize=13)
    ax.legend(); ax.set_ylim(0, 110)
    fig.tight_layout()
    fig.savefig(EVAL / "supplier_score_breakdown.png", dpi=160)
    plt.close(fig)

    metrics = {
        "suppliers_scored": int(len(suppliers)),
        "low_risk_count": int((suppliers["risk_tier"] == "Low Risk").sum()),
        "medium_risk_count": int((suppliers["risk_tier"] == "Medium Risk").sum()),
        "high_risk_count": int((suppliers["risk_tier"] == "High Risk").sum()),
        "weights": WEIGHTS,
    }
    register_model("supplier_scorer", "1.0", "WeightedCompositeScore",
                    metrics, "models/supplier_scores.csv", "overall_score")
    return metrics


def optimize_inventory(d2: pd.DataFrame) -> dict:
    """Calculate reorder points, safety stock, and stockout risk."""
    print("\n" + "=" * 60)
    print("MODEL 4: Inventory Optimizer")
    print("=" * 60)

    Z = 1.65  # 95% service level
    DEMAND_PERIOD_DAYS = 30  # assume products_sold represents ~30 days

    inv = d2[["sku", "product_type", "supplier_name", "stock_levels",
              "products_sold", "source_lead_time_days", "availability",
              "revenue_generated", "product_price"]].copy()

    inv["avg_daily_demand"] = inv["products_sold"] / DEMAND_PERIOD_DAYS
    inv["std_daily_demand"] = inv["avg_daily_demand"] * 0.3  # 30% CV assumption
    inv["lead_time_days"] = inv["source_lead_time_days"].fillna(
        inv["source_lead_time_days"].median()
    )

    inv["safety_stock"] = (Z * inv["std_daily_demand"] * np.sqrt(inv["lead_time_days"])).round(1)
    inv["reorder_point"] = (inv["avg_daily_demand"] * inv["lead_time_days"] + inv["safety_stock"]).round(1)
    inv["days_of_inventory"] = np.where(
        inv["avg_daily_demand"] > 0,
        (inv["stock_levels"] / inv["avg_daily_demand"]).round(1),
        np.nan,
    )
    inv["stockout_risk"] = (inv["stock_levels"] < inv["reorder_point"]).astype(int)
    inv["reorder_qty"] = np.where(
        inv["stockout_risk"] == 1,
        (inv["reorder_point"] - inv["stock_levels"] + inv["safety_stock"]).clip(lower=0).round(0),
        0,
    )
    inv["revenue_at_risk"] = np.where(
        inv["stockout_risk"] == 1,
        (inv["reorder_qty"] * inv["product_price"]).round(2),
        0,
    )

    out_path = MODELS / "inventory_recommendations.csv"
    inv.to_csv(out_path, index=False)

    at_risk = inv["stockout_risk"].sum()
    total = len(inv)
    total_revenue_risk = inv["revenue_at_risk"].sum()

    print(f"\n  SKUs analyzed: {total}")
    print(f"  At stockout risk: {at_risk} ({at_risk/total*100:.0f}%)")
    print(f"  Revenue at risk: ${total_revenue_risk:,.0f}")
    print(f"  Avg safety stock: {inv['safety_stock'].mean():.1f} units")
    print(f"  Avg reorder point: {inv['reorder_point'].mean():.1f} units")
    print(f"  Avg days of inventory: {inv['days_of_inventory'].mean():.1f} days")
    print(f"\n  Saved: {out_path.name}")

    # Stockout risk chart
    risk_by_type = inv.groupby("product_type")["stockout_risk"].mean() * 100
    fig, ax = plt.subplots(figsize=(8, 5))
    risk_by_type.sort_values().plot(kind="barh", ax=ax, color="#ef4444")
    ax.set_xlabel("% SKUs at Stockout Risk"); ax.set_title("Stockout Risk by Product Type", fontsize=13)
    fig.tight_layout()
    fig.savefig(EVAL / "inventory_stockout_risk.png", dpi=160)
    plt.close(fig)

    # Days of inventory chart
    fig, ax = plt.subplots(figsize=(9, 6))
    colors = ["#ef4444" if r else "#22c55e" for r in inv["stockout_risk"]]
    ax.scatter(inv["avg_daily_demand"], inv["stock_levels"], c=colors, s=50, alpha=0.7)
    ax.set_xlabel("Avg Daily Demand"); ax.set_ylabel("Current Stock Levels")
    ax.set_title("Inventory: Stock vs Demand (Red = At Risk)", fontsize=13)
    fig.tight_layout()
    fig.savefig(EVAL / "inventory_stock_vs_demand.png", dpi=160)
    plt.close(fig)

    metrics = {
        "skus_analyzed": total,
        "at_stockout_risk": at_risk,
        "stockout_risk_pct": round(at_risk / total * 100, 1),
        "total_revenue_at_risk": round(total_revenue_risk, 2),
        "avg_safety_stock": round(float(inv["safety_stock"].mean()), 1),
        "avg_reorder_point": round(float(inv["reorder_point"].mean()), 1),
        "service_level": 0.95,
    }
    register_model("inventory_optimizer", "1.0", "AnalyticalFormulas",
                    metrics, "models/inventory_recommendations.csv", "reorder_point")
    return metrics


def main() -> None:
    print("=" * 60)
    print("SupplyChainIQ ML Pipeline")
    print("=" * 60)

    # Load feature data
    print("\n[Loading data...]")
    d1 = pd.read_csv(PROCESSED / "supplychainiq_dataset1_features.csv", low_memory=False)
    d2 = pd.read_csv(PROCESSED / "supplychainiq_dataset2_features.csv")
    print(f"  Dataset 1 features: {d1.shape[0]:,} x {d1.shape[1]}")
    print(f"  Dataset 2 features: {d2.shape[0]:,} x {d2.shape[1]}")

    # Train all models
    train_delay_predictor(d1)
    train_demand_forecaster(d1)
    score_suppliers(d2)
    optimize_inventory(d2)

    # Save registry
    registry_path = MODELS / "model_registry.json"
    with registry_path.open("w", encoding="utf-8") as f:
        json.dump(MODEL_REGISTRY, f, indent=2, default=str)
    print(f"\n  Model registry saved: {registry_path.name}")

    print("\n" + "=" * 60)
    print("All models trained and evaluated successfully.")
    print("=" * 60)


if __name__ == "__main__":
    main()
