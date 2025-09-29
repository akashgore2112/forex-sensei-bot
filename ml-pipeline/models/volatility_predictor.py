# =============================================================================
# 📊 XGBoost Volatility Predictor (Python version)
# Phase 2 - Step 1.3
# Safe mode: handles volume=0 gracefully
# =============================================================================

import os
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

        # Required core fields
        required = ["close", "high", "low", "atr", "rsi", "adx"]
        if any(current.get(f) in [None, 0] for f in required):
            print(f"⚠️ Skipped sample @i={i} → Missing required core fields")
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
            print(f"⚠️ Skipped sample @i={i} → Non-finite feature values {features}")
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

    def calculate_future_volatility(self, data, i, horizon=5):
        future_slice = data[i + 1:i + 1 + horizon]
        if not future_slice:
            print(f"⚠️ Skipped sample @i={i} → No future candles")
            return None

        atr_values = [c["atr"] for c in future_slice if c.get("atr") is not None]
        if not atr_values:
            print(f"⚠️ Skipped sample @i={i} → Future ATR missing")
            return None

        return np.mean(atr_values)

    # =========================================================================
    # 📌 Training
    # =========================================================================
    def train_model(self, historical_data):
        features, targets = [], []

        print(f"📊 Preparing training dataset from {len(historical_data)} candles...")

        for i in range(20, len(historical_data) - 5):
            f = self.prepare_features(historical_data, i)
            t = self.calculate_future_volatility(historical_data, i, 5)
            if f and t and t > 0:
                features.append(f)
                targets.append(t)

        print(f"✅ Prepared {len(features)} samples for training")

        if len(features) < 300:
            raise ValueError(f"❌ Not enough valid samples (need 300+, got {len(features)})")

        # Train/test split
        split = int(len(features) * 0.8)
        X_train, y_train = np.array(features[:split]), np.array(targets[:split])
        X_test, y_test = np.array(features[split:]), np.array(targets[split:])

        print("⚡ Training XGBoost regressor...")

        dtrain = xgb.DMatrix(X_train, label=y_train)
        dtest = xgb.DMatrix(X_test, label=y_test)

        params = {
            "objective": "reg:squarederror",
            "max_depth": 6,
            "eta": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
        }

        self.model = xgb.train(params, dtrain, num_boost_round=200)

        # Evaluate MAE
        preds = self.model.predict(dtest)
        mae = float(np.mean(np.abs(preds - y_test)))

        self.training_metrics = {
            "samples": len(features),
            "trainSize": len(X_train),
            "testSize": len(X_test),
            "meanAbsoluteError": mae,
        }

        self.trained = True

        print("✅ Training completed!")
        print(f"📊 MAE on test set: {mae:.6f}")

        return self.training_metrics

    # =========================================================================
    # 📌 Prediction
    # =========================================================================
    def predict(self, current_data):
        if not self.trained or self.model is None:
            raise RuntimeError("❌ Model not trained or loaded")

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
    # 📌 Save / Load
    # =========================================================================
    def save_model(self, filepath="./saved-models/volatility-model.json"):
        if not self.model:
            raise RuntimeError("❌ No model to save")

        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        self.model.save_model(filepath + ".bin")

        save_obj = {
            "trainedAt": str(np.datetime64("now")),
            "trainingMetrics": self.training_metrics,
        }
        with open(filepath, "w") as f:
            json.dump(save_obj, f)

        print(f"💾 Model saved to {filepath} (+ binary at {filepath}.bin)")

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
        print(f"📂 Model loaded from {filepath}")


# Quick test hook
if __name__ == "__main__":
    print("✅ VolatilityPredictor Python module ready")
