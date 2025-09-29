// ml-pipeline/models/volatility-predictor.js
// 📊 XGBoost Volatility Predictor
// Goal: Predict next 5-day volatility (ATR-based) for risk management

const fs = require("fs");
const path = require("path");
const xgboost = require("ml-xgboost");

class VolatilityPredictor {
  constructor() {
    this.model = null;
    this.trained = false;
    this.trainingMetrics = null;
  }

  /**
   * Extract feature vector from market data
   */
  prepareFeatures(data, i) {
    const current = data[i];
    const prev = data[i - 1] || current;

    // ✅ Strict mode: ensure required fields exist
    if (
      !current.close ||
      !current.high ||
      !current.low ||
      !current.atr ||
      !current.rsi ||
      !current.volume ||
      !current.avgVolume ||
      !current.adx
    ) {
      return null;
    }

    const features = [
      current.atr, // Current ATR
      prev.atr > 0 ? (current.atr - prev.atr) / prev.atr : 0, // ATR change
      (current.high - current.low) / current.close, // Price range
      prev.rsi > 0 ? (current.rsi - prev.rsi) / prev.rsi : 0, // RSI velocity
      current.avgVolume > 0 ? current.volume / current.avgVolume : 1, // Volume spike
      this.calculateRecentSwings(data, i, 10), // Count swings last 10 candles
      current.adx || 20 // Trend strength (ADX)
    ];

    return features.map((v) =>
      Number.isFinite(v) && !Number.isNaN(v) ? Number(v) : 0
    );
  }

  /**
   * Count number of significant swings in last N candles
   */
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

  /**
   * Compute target variable: average ATR of next 5 candles
   */
  calculateFutureVolatility(data, i, horizon = 5) {
    const futureSlice = data.slice(i + 1, i + 1 + horizon);
    if (!futureSlice.length) return null;

    const atrValues = futureSlice
      .map((c) => c.atr)
      .filter((v) => v !== undefined && v !== null && !Number.isNaN(v));

    if (!atrValues.length) return null;

    return atrValues.reduce((a, b) => a + b, 0) / atrValues.length;
  }

  /**
   * Train XGBoost regression model
   */
  async trainModel(historicalData) {
    const features = [];
    const targets = [];

    console.log(
      `📊 Preparing training dataset from ${historicalData.length} candles...`
    );

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
      throw new Error(
        `Not enough valid samples to train volatility model (need 300+, got ${features.length})`
      );
    }

    // Split train/test
    const split = Math.floor(features.length * 0.8);
    const X_train = features.slice(0, split);
    const y_train = targets.slice(0, split);
    const X_test = features.slice(split);
    const y_test = targets.slice(split);

    console.log("⚡ Training XGBoost regressor...");
    this.model = new xgboost.XGBoostRegressor({
      maxDepth: 6,
      nEstimators: 100,
      learningRate: 0.1,
    });

    await this.model.fit(X_train, y_train);

    // Evaluate on test
    const preds = this.model.predict(X_test);
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

  /**
   * Predict volatility for current data
   */
  predict(currentData) {
    if (!this.trained || !this.model) {
      throw new Error("Model not trained");
    }

    const f = this.prepareFeatures(currentData, currentData.length - 1);
    if (!f) {
      throw new Error("Invalid input data for prediction");
    }

    const predictedVolatility = this.model.predict([f])[0];
    const currentVolatility = currentData[currentData.length - 1].atr || 0;

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

  /**
   * Convert raw ATR prediction into LOW/MEDIUM/HIGH
   */
  categorizeVolatility(predictedVolatility, data) {
    const lastClose = data[data.length - 1]?.close || 1;
    const ratio = predictedVolatility / lastClose;

    if (ratio < 0.005) return "LOW";
    if (ratio < 0.01) return "MEDIUM";
    return "HIGH";
  }

  /**
   * Risk adjustment factor (0.5x – 2.0x)
   */
  calculateRiskAdjustment(volatility) {
    if (volatility <= 0) return 1.0;
    if (volatility < 0.005) return 2.0;
    if (volatility < 0.01) return 1.2;
    return 0.5;
  }

  /**
   * Save model to file
   */
  async saveModel(filepath = "./saved-models/volatility-model.json") {
    if (!this.model) throw new Error("No model to save");

    const modelData = await this.model.toJSON();
    const saveObj = {
      modelData,
      trainedAt: new Date().toISOString(),
      trainingMetrics: this.trainingMetrics,
    };

    await fs.promises.writeFile(filepath, JSON.stringify(saveObj));
    console.log(`💾 Volatility model saved to ${filepath}`);
  }

  /**
   * Load model from file
   */
  async loadModel(filepath = "./saved-models/volatility-model.json") {
    if (!fs.existsSync(filepath)) {
      throw new Error("Saved model not found");
    }

    const raw = await fs.promises.readFile(filepath, "utf8");
    const parsed = JSON.parse(raw);

    this.model = new xgboost.XGBoostRegressor();
    await this.model.loadModel(parsed.modelData);

    this.trainingMetrics = parsed.trainingMetrics || null;
    this.trained = true;

    console.log(`📂 Volatility model loaded from ${filepath}`);
  }
}

module.exports = VolatilityPredictor;
