"""SupplyChainIQ — ML model loading and inference service."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from backend.config import get_settings

_settings = get_settings()


class MLService:
    """Loads trained models and runs inference."""

    def __init__(self) -> None:
        self._delay_model: dict | None = None
        self._demand_model: dict | None = None

    # Lazy loaders

    def _load_delay_model(self) -> dict:
        if self._delay_model is None:
            path = _settings.models_dir / "delay_predictor.joblib"
            self._delay_model = joblib.load(path)
        return self._delay_model

    def _load_demand_model(self) -> dict:
        if self._demand_model is None:
            path = _settings.models_dir / "demand_forecaster.joblib"
            self._demand_model = joblib.load(path)
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
