# =============================================================================
# 📊 XGBoost Volatility Predictor (Python version)
# Phase 2 - Step 1.3 (Prediction Only)
# Safe mode: handles volume=0 gracefully
# =============================================================================

import os
import sys
import json
import numpy as np
import xgboost as xgb

class VolatilityPredictor:
    def __init__(self):
        self.model = None
        self.trained = False
        self.training_metrics = None

    # =========================================================================
    # 📌 Feature Engineering
    # =========================================================================
    def prepare_features(self, data, i):
        current = data[i]
        prev = data[i - 1] if i > 0 else current

        required = ["close", "high", "low", "atr", "rsi", "adx"]
        if any(current.get(f) in [None, 0] for f in required):
            return None

        atr = current["atr"]
        atr_change = (current["atr"] - prev["atr"]) / prev["atr"] if prev["atr"] > 0 else 0
        intraday_range = (current["high"] - current["low"]) / current["close"]
        rsi_velocity = (current["rsi"] - prev["rsi"]) / prev["rsi"] if prev["rsi"] > 0 else 0
        vol_ratio = (current.get("volume", 1) / current.get("avgVolume", 1)) if current.get("avgVolume", 1) > 0 else 1
        swings = self.calculate_recent_swings(data, i, 10)
        adx = current.get("adx", 20)

        features = [atr, atr_change, intraday_range, rsi_velocity, vol_ratio, swings, adx]

        if not all(np.isfinite(features)):
            return None

        return features

    def calculate_recent_swings(self, data, index, lookback=10):
        swings = 0
        for j in range(max(1, index - lookback), index):
            prev = data[j - 1]
            curr = data[j]
            if not prev or not curr:
                continue
            change = abs(curr["close"] - prev["close"]) / prev["close"]
            if change > 0.005:
                swings += 1
        return swings

    # =========================================================================
    # 📌 Prediction
    # =========================================================================
    def predict(self, current_data):
        if not self.trained or self.model is None:
            raise RuntimeError("❌ Model not loaded")

        if isinstance(current_data, list):
            f = self.prepare_features(current_data, len(current_data) - 1)
            current_vol = current_data[-1].get("atr", 0)
        else:
            f = self.prepare_features([current_data], 0)
            current_vol = current_data.get("atr", 0)

        if not f:
            raise ValueError("❌ Invalid input for prediction")

        dtest = xgb.DMatrix([f])
        predicted_vol = float(self.model.predict(dtest)[0])

        percent_change = ((predicted_vol - current_vol) / current_vol * 100) if current_vol > 0 else 0

        return {
            "predictedVolatility": predicted_vol,
            "volatilityLevel": self.categorize_volatility(predicted_vol, current_data),
            "riskAdjustment": self.calculate_risk_adjustment(predicted_vol),
            "confidence": 1 - min(1, abs(percent_change) / 100),
            "currentVolatility": current_vol,
            "percentChange": percent_change,
            "recommendation": "REDUCE_POSITION" if predicted_vol > current_vol else "NORMAL_POSITION",
        }

    def categorize_volatility(self, predicted_vol, data):
        last_close = data[-1]["close"] if isinstance(data, list) else data.get("close", 1)
        ratio = predicted_vol / last_close
        if ratio < 0.005: return "LOW"
        if ratio < 0.01: return "MEDIUM"
        return "HIGH"

    def calculate_risk_adjustment(self, volatility):
        if volatility <= 0: return 1.0
        if volatility < 0.005: return 2.0
        if volatility < 0.01: return 1.2
        return 0.5

    # =========================================================================
    # 📌 Load Model
    # =========================================================================
    def load_model(self, filepath="./saved-models/volatility-model.json"):
        bin_path = filepath + ".bin"
        if not os.path.exists(bin_path):
            raise FileNotFoundError("❌ Saved model not found")

        self.model = xgb.Booster()
        self.model.load_model(bin_path)

        with open(filepath, "r") as f:
            meta = json.load(f)
            self.training_metrics = meta.get("trainingMetrics", None)

        self.trained = True


# =========================================================================
# 📌 CLI Wrapper (Node.js bridge: Prediction only)
# =========================================================================
if __name__ == "__main__":
    vp = VolatilityPredictor()
    try:
        raw_input = sys.stdin.read().strip()
        if not raw_input:
            print(json.dumps({"error": "❌ No input received"}))
            sys.exit(1)

        candle = json.loads(raw_input)

        model_path = "./saved-models/volatility-model.json"
        vp.load_model(model_path)

        result = vp.predict(candle)

        # Print JSON result for Node.js
        print(json.dumps(result))
        sys.stdout.flush()   # ✅ prevents EPIPE

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
