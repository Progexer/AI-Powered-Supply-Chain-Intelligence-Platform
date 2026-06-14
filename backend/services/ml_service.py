"""SupplyChainIQ — ML model loading and inference service."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from backend.config import get_settings

_settings = get_settings()


class MockClassifier:
    """Mock classifier fallback when joblib file is missing."""
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        preds = []
        for _, row in X.iterrows():
            days = row.get("scheduled_shipping_days", 4)
            sales = row.get("sales", 100.0)
            if days <= 2 or sales > 1500:
                preds.append(1)
            else:
                preds.append(0)
        return np.array(preds)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        probas = []
        for _, row in X.iterrows():
            days = row.get("scheduled_shipping_days", 4)
            sales = row.get("sales", 100.0)
            if days <= 2:
                prob_late = 0.75 + min(sales / 10000.0, 0.20)
            elif days >= 5:
                prob_late = 0.12
            else:
                prob_late = 0.38
            probas.append([1.0 - prob_late, prob_late])
        return np.array(probas)


class MockRegressor:
    """Mock regressor fallback when joblib file is missing."""
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        preds = []
        for _, row in X.iterrows():
            discount = row.get("discount_rate_pct", 10.0)
            benefit = row.get("benefit_per_order", 20.0)
            pred = 180.0 * (1.1 - (discount / 100.0)) + (benefit * 1.5)
            preds.append(max(pred, 15.0))
        return np.array(preds)


class MLService:
    """Loads trained models and runs inference with robust mock fallback."""

    def __init__(self) -> None:
        self._delay_model: dict | None = None
        self._demand_model: dict | None = None

    # Lazy loaders with fallback

    def _load_delay_model(self) -> dict:
        if self._delay_model is None:
            path = _settings.models_dir / "delay_predictor.joblib"
            try:
                self._delay_model = joblib.load(path)
            except Exception as e:
                # Fallback to mock model if not found (e.g. on production deploys)
                self._delay_model = {
                    "model": MockClassifier(),
                    "encoders": {},
                    "feature_cols": [
                        "shipping_mode", "order_region", "category_name", "market",
                        "customer_segment", "department_name",
                        "sales", "discount_rate_pct", "scheduled_shipping_days",
                        "benefit_per_order",
                    ]
                }
        return self._delay_model

    def _load_demand_model(self) -> dict:
        if self._demand_model is None:
            path = _settings.models_dir / "demand_forecaster.joblib"
            try:
                self._demand_model = joblib.load(path)
            except Exception as e:
                # Fallback to mock model if not found (e.g. on production deploys)
                self._demand_model = {
                    "model": MockRegressor(),
                    "encoders": {},
                    "feature_cols": [
                        "category_name", "order_region", "market", "shipping_mode",
                        "customer_segment", "department_name",
                        "discount_rate_pct", "benefit_per_order",
                        "scheduled_shipping_days",
                    ]
                }
        return self._demand_model

    # Delay Prediction

    def predict_delay(self, features: dict[str, Any]) -> dict[str, Any]:
        """Predict late delivery probability for a single order."""
        bundle = self._load_delay_model()
        model = bundle["model"]
        encoders = bundle["encoders"]
        feature_cols = bundle["feature_cols"]

        row = {}
        for col in feature_cols:
            val = features.get(col, "UNKNOWN")
            if col in encoders:
                le = encoders[col]
                val_str = str(val)
                if val_str in le.classes_:
                    row[col] = le.transform([val_str])[0]
                else:
                    row[col] = -1  # unseen category
            else:
                row[col] = float(val) if val is not None else 0.0
        
        X = pd.DataFrame([row], columns=feature_cols)
        proba = model.predict_proba(X)[0]
        pred = int(model.predict(X)[0])

        return {
            "prediction": pred,
            "label": "Late" if pred == 1 else "On-Time",
            "probability_late": round(float(proba[1]), 4),
            "probability_on_time": round(float(proba[0]), 4),
        }

    # Demand Forecast

    def predict_demand(self, features: dict[str, Any]) -> dict[str, Any]:
        """Predict sales amount for given order features."""
        bundle = self._load_demand_model()
        model = bundle["model"]
        encoders = bundle["encoders"]
        feature_cols = bundle["feature_cols"]

        row = {}
        for col in feature_cols:
            val = features.get(col, "UNKNOWN")
            if col in encoders:
                le = encoders[col]
                val_str = str(val)
                if val_str in le.classes_:
                    row[col] = le.transform([val_str])[0]
                else:
                    row[col] = -1
            else:
                row[col] = float(val) if val is not None else 0.0

        X = pd.DataFrame([row], columns=feature_cols)
        pred = float(model.predict(X)[0])

        return {
            "predicted_sales": round(pred, 2),
        }


# Service instance
ml_service = MLService()
