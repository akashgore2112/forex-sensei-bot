// ============================================================================
// 📊 XGBoost Volatility Predictor (using ml-xgboost booster API)
// Phase 2 - Step 1.3 (Diagnostic Mode Enabled)
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

    if (
      !current.close || !current.high || !current.low ||
      !current.atr || !current.rsi || !current.volume ||
      !current.avgVolume || !current.adx
    ) {
      console.warn(`⚠️ Skipped sample @i=${i} → Missing required field(s)`);
      return null;
    }

    const features = [
      current.atr, 
      prev.atr > 0 ? (current.atr - prev.atr) / prev.atr : 0,
      (current.high - current.low) / current.close,
      prev.rsi > 0 ? (current.rsi - prev.rsi) / prev.rsi : 0,
      current.avgVolume > 0 ? current.volume / current.avgVolume : 1,
      this.calculateRecentSwings(data, i, 10),
      current.adx || 20
    ];

    // log if any feature is NaN
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
    if (!futureSlice.length) {
      console.warn(`⚠️ Skipped sample @i=${i} → No future candles for ATR calc`);
      return null;
    }

    const atrValues = futureSlice
      .map(c => c.atr)
      .filter(v => v !== undefined && v !== null && !Number.isNaN(v));

    if (!atrValues.length) {
      console.warn(`⚠️ Skipped sample @i=${i} → Future ATR missing`);
      return null;
    }

    return atrValues.reduce((a, b) => a + b, 0) / atrValues.length;
  }

  // ==========================================================================
  // 📌 Training
  // ==========================================================================
  async trainModel(historicalData) {
    const features = [];
    const targets = [];

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

    const dtrain = new xgboost.DMatrix(X_train, y_train);
    const dtest = new xgboost.DMatrix(X_test, y_test);

    this.booster = await xgboost.train(
      {
        objective: "reg:squarederror",
        max_depth: 6,
        eta: 0.1,
        num_round: 200,
        subsample: 0.8,
        colsample_bytree: 0.8,
      },
      dtrain,
      200,
      { evals: [[dtest, "test"]] }
    );

    const preds = this.booster.predict(dtest);
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

  // rest of your predict, categorizeVolatility, calculateRiskAdjustment, saveModel, loadModel unchanged
  // ...
}

module.exports = VolatilityPredictor;
