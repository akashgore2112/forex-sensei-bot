// ============================================================================
// 📊 XGBoost Volatility Predictor (using ml-xgboost booster API)
// Phase 2 - Step 1.3 (Safe mode with fallbacks for volume=0)
// ============================================================================

const fs = require("fs");
const path = require("path");
const xgboost = require("ml-xgboost");

class VolatilityPredictor {
  constructor() {
    this.booster = null;
    this.trained = false;
    this.trainingMetrics = null;
  }

  // ==========================================================================
  // 📌 Feature Engineering
  // ==========================================================================
  prepareFeatures(data, i) {
    const current = data[i];
    const prev = data[i - 1] || current;

    if (!current.close || !current.high || !current.low || !current.atr || !current.rsi || !current.adx) {
      console.warn(`⚠️ Skipped sample @i=${i} → Missing required core field(s)`);
      return null;
    }

    const features = [
      current.atr,  // ATR
      prev.atr > 0 ? (current.atr - prev.atr) / prev.atr : 0, // ATR change %
      (current.high - current.low) / current.close, // intraday range
      prev.rsi > 0 ? (current.rsi - prev.rsi) / prev.rsi : 0, // RSI velocity
      current.avgVolume > 0 ? (current.volume || 1) / current.avgVolume : 1, // Volume ratio (fallback if 0)
      this.calculateRecentSwings(data, i, 10), // swing count
      current.adx || 20 // ADX (trend strength)
    ];

    if (features.some(v => !Number.isFinite(v))) {
      console.warn(`⚠️ Skipped sample @i=${i} → Non-finite feature: ${JSON.stringify(features)}`);
      return null;
    }

    return features.map(v => Number.isFinite(v) ? v : 0);
  }

  calculateRecentSwings(data, index, lookback = 10) {
    let swings = 0;
    for (let j = Math.max(1, index - lookback); j < index; j++) {
      const prev = data[j - 1];
      const curr = data[j];
      if (!prev || !curr) continue;
      const change = Math.abs(curr.close - prev.close) / prev.close;
      if (change > 0.005) swings++;
    }
    return swings;
  }

  calculateFutureVolatility(data, i, horizon = 5) {
    const futureSlice = data.slice(i + 1, i + 1 + horizon);
    if (!futureSlice.length) return null;

    const atrValues = futureSlice
      .map(c => c.atr)
      .filter(v => v !== undefined && v !== null && !Number.isNaN(v));

    if (!atrValues.length) return null;

    return atrValues.reduce((a, b) => a + b, 0) / atrValues.length;
  }

  // ==========================================================================
  // 📌 Training
  // ==========================================================================
  async trainModel(historicalData) {
    let features = [];
    let targets = [];

    console.log(`📊 Preparing training dataset from ${historicalData.length} candles...`);

    for (let i = 20; i < historicalData.length - 5; i++) {
      const f = this.prepareFeatures(historicalData, i);
      const target = this.calculateFutureVolatility(historicalData, i, 5);

      if (f && target && target > 0) {
        features.push(f);
        targets.push(target);
      }
    }

    console.log(`✅ Prepared ${features.length} samples for training`);

    if (features.length < 300) {
      throw new Error(`❌ Not enough valid samples to train volatility model (need 300+, got ${features.length})`);
    }

    // Train/test split
    const split = Math.floor(features.length * 0.8);
    const X_train = features.slice(0, split);
    const y_train = targets.slice(0, split);
    const X_test = features.slice(split);
    const y_test = targets.slice(split);

    console.log("⚡ Training XGBoost regressor...");

    this.booster = await xgboost.train(
      {
        objective: "reg:squarederror",
        max_depth: 6,
        eta: 0.1,
        num_round: 200,
        subsample: 0.8,
        colsample_bytree: 0.8,
      },
      X_train,
      y_train
    );

    // Evaluate test MAE
    const preds = this.booster.predict(X_test);
    const mae =
      preds.reduce((sum, p, i) => sum + Math.abs(p - y_test[i]), 0) /
      y_test.length;

    this.trainingMetrics = {
      samples: features.length,
      trainSize: X_train.length,
      testSize: X_test.length,
      meanAbsoluteError: mae,
    };

    this.trained = true;

    console.log("✅ Training completed!");
    console.log(`📊 MAE on test set: ${mae.toFixed(6)}`);

    return this.trainingMetrics;
  }

  // ==========================================================================
  // 📌 Prediction
  // ==========================================================================
  predict(currentData) {
    if (!this.trained || !this.booster) {
      throw new Error("❌ Model not trained or loaded");
    }

    const f = Array.isArray(currentData)
      ? this.prepareFeatures(currentData, currentData.length - 1)
      : this.prepareFeatures([currentData], 0);

    if (!f) throw new Error("❌ Invalid input for prediction");

    const predictedVolatility = this.booster.predict([f])[0];
    const currentVolatility = Array.isArray(currentData)
      ? currentData[currentData.length - 1].atr || 0
      : currentData.atr || 0;

    const percentChange =
      currentVolatility > 0
        ? ((predictedVolatility - currentVolatility) / currentVolatility) * 100
        : 0;

    return {
      predictedVolatility,
      volatilityLevel: this.categorizeVolatility(predictedVolatility, currentData),
      riskAdjustment: this.calculateRiskAdjustment(predictedVolatility),
      confidence: 1 - Math.min(1, Math.abs(percentChange) / 100),
      currentVolatility,
      percentChange,
      recommendation:
        predictedVolatility > currentVolatility
          ? "REDUCE_POSITION"
          : "NORMAL_POSITION",
    };
  }

  categorizeVolatility(predictedVolatility, data) {
    const lastClose = Array.isArray(data)
      ? data[data.length - 1]?.close || 1
      : data.close || 1;

    const ratio = predictedVolatility / lastClose;

    if (ratio < 0.005) return "LOW";
    if (ratio < 0.01) return "MEDIUM";
    return "HIGH";
  }

  calculateRiskAdjustment(volatility) {
    if (volatility <= 0) return 1.0;
    if (volatility < 0.005) return 2.0;
    if (volatility < 0.01) return 1.2;
    return 0.5;
  }

  // ==========================================================================
  // 📌 Save / Load
  // ==========================================================================
  async saveModel(filepath = "./saved-models/volatility-model.json") {
    if (!this.booster) throw new Error("❌ No model to save");

    const boosterJSON = await this.booster.toJSON();
    const saveObj = {
      boosterJSON,
      trainedAt: new Date().toISOString(),
      trainingMetrics: this.trainingMetrics,
    };

    await fs.promises.writeFile(filepath, JSON.stringify(saveObj));
    console.log(`💾 Volatility model saved to ${filepath}`);
  }

  async loadModel(filepath = "./saved-models/volatility-model.json") {
    if (!fs.existsSync(filepath)) {
      throw new Error("❌ Saved model not found");
    }

    const raw = await fs.promises.readFile(filepath, "utf8");
    const parsed = JSON.parse(raw);

    this.booster = await xgboost.Booster.loadModel(parsed.boosterJSON);
    this.trainingMetrics = parsed.trainingMetrics || null;
    this.trained = true;

    console.log(`📂 Volatility model loaded from ${filepath}`);
  }
}

module.exports = VolatilityPredictor;
