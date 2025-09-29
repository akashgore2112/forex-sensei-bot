# ============================================================================
# 📊 Volatility Trainer (Python version with XGBoost)
# Step 1.3 - Used by Node.js via child_process
# ============================================================================

import sys
import json
import xgboost as xgb
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error

def prepare_features(data, horizon=5):
    features = []
    targets = []

    for i in range(20, len(data) - horizon):
        curr = data[i]
        prev = data[i - 1]

        # Required fields check
        required = ["close", "high", "low", "atr", "rsi", "volume", "avgVolume", "adx"]
        if any(curr.get(f) in [None, float("nan")] for f in required):
            continue

        # Features
        f = [
            curr["atr"],
            (curr["atr"] - prev.get("atr", curr["atr"])) / (prev.get("atr", 1) or 1),
            (curr["high"] - curr["low"]) / (curr["close"] or 1),
            (curr["rsi"] - prev.get("rsi", curr["rsi"])) / (prev.get("rsi", 1) or 1),
            (curr["volume"] or 1) / (curr["avgVolume"] or 1),
            curr.get("adx", 20)
        ]

        if not all(np.isfinite(x) for x in f):
            continue

        # Target (future ATR average)
        future_slice = data[i+1 : i+1+horizon]
        atr_values = [c.get("atr") for c in future_slice if c.get("atr")]
        if not atr_values:
            continue

        target = float(np.mean(atr_values))
        features.append(f)
        targets.append(target)

    return np.array(features), np.array(targets)


def train_model(candles):
    X, y = prepare_features(candles)

    if len(X) < 300:
        return {"error": f"Not enough samples to train (got {len(X)}, need 300+)"}

    # Train/Test split
    split = int(len(X) * 0.8)
    X_train, y_train = X[:split], y[:split]
    X_test, y_test = X[split:], y[split:]

    dtrain = xgb.DMatrix(X_train, label=y_train)
    dtest = xgb.DMatrix(X_test, label=y_test)

    params = {
        "objective": "reg:squarederror",
        "max_depth": 6,
        "eta": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
    }

    booster = xgb.train(params, dtrain, num_boost_round=200, evals=[(dtest, "test")])

    preds = booster.predict(dtest)
    mae = mean_absolute_error(y_test, preds)

    # Save model
    model_path = "./saved-models/volatility-model.xgb"
    booster.save_model(model_path)

    return {
        "samples": len(X),
        "trainSize": len(X_train),
        "testSize": len(X_test),
        "mae": mae,
        "modelPath": model_path
    }


if __name__ == "__main__":
    raw = sys.stdin.read()
    data = json.loads(raw)
    result = train_model(data)
    print(json.dumps(result))
