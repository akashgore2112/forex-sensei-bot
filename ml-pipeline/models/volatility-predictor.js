// 📊 Volatility Predictor using XGBoost (ml-xgboost)
const fs = require("fs");
const path = require("path");
const xgboost = require("ml-xgboost");

class VolatilityPredictor {
  constructor() {
    this.model = null;
    this.normalizer = null;
  }

  // ✅ Extract features from historical candle
  prepareFeatures(data, i) {
    const current = data[i];
    const prev = data[i - 1] || current;

    const atrChange =
      prev.atr > 0 ? (current.atr - prev.atr) / prev.atr : 0;

    const priceRange =
      current.close > 0 ? (current.high - current.low) / current.close : 0;

    const rsiVelocity =
      prev.rsi > 0 ? (current.rsi - prev.rsi) / prev.rsi : 0;

    const volumeSpike =
      current.avgVolume > 0 ? current.volume / current.avgVolume : 1;

    const recentSwings = this.calculateRecentSwings(data, i, 10);

    return [
      current.atr || 0, // ATR level
      atrChange, // ATR change
      priceRange, // Price range %
      rsiVelocity, // RSI velocity
      volumeSpike, // Volume spike ratio
      recentSwings, // Swing count
      current.adx || 0, // ADX / trend strength
    ];
  }

  // ✅ Calculate next 5-day average ATR (target)
  calculateFutureVolatility(data, i) {
    const future = data.slice(i + 1, i + 6);
    if (future.length < 5) return null;
    return (
      future.reduce((sum, c) => sum + (c.atr || 0), 0) / future.length
    );
  }

  // ✅ Count significant swings (last N candles)
  calculateRecentSwings(data, i, lookback = 10) {
    const slice = data.slice(Math.max(0, i - lookback), i);
    let swings = 0;
    for (let j = 1; j < slice.length; j++) {
      const change = (slice[j].close - slice[j - 1].close) / slice[j - 1].close;
      if (Math.abs(change) > 0.003) swings++;
    }
    return swings;
  }

  // ✅ Train model
  async trainModel(data) {
    const features = [];
    const targets = [];

    for (let i = 20; i < data.length - 5; i++) {
      const feat = this.prepareFeatures(data, i);
      const target = this.calculateFutureVolatility(data, i);
      if (target !== null && feat.every((f) => !isNaN(f))) {
        features.push(feat);
        targets.push(target);
      }
    }

    if (features.length < 200) {
      throw new Error(
        `Not enough samples for training. Got ${features.length}, need 200+`
      );
    }

    // Train/test split
    const split = Math.floor(features.length * 0.8);
    const X_train = features.slice(0, split);
    const y_train = targets.slice(0, split);
    const X_test = features.slice(split);
    const y_test = targets.slice(split);

    console.log(`📊 Training samples: ${X_train.length}, Test: ${X_test.length}`);

    // Train XGBoost regressor
    this.model = new xgboost.XGBRegressor({
      maxDepth: 6,
      nEstimators: 200,
      learningRate: 0.1,
    });
    await this.model.fit(X_train, y_train);

    // Evaluate
    const preds = await this.model.predict(X_test);
    const metrics = this.evaluateModel(y_test, preds);

    console.log("✅ Model training complete!");
    console.log(
      `   MAE: ${metrics.mae.toFixed(6)}, R²: ${metrics.r2.toFixed(3)}`
    );

    this.trainingMetrics = metrics;
    return metrics;
  }

  // ✅ Evaluate with MAE and R²
  evaluateModel(y_true, y_pred) {
    const n = y_true.length;
    const mae =
      y_true.reduce((sum, y, i) => sum + Math.abs(y - y_pred[i]), 0) / n;

    const meanY = y_true.reduce((a, b) => a + b, 0) / n;
    const ssTot = y_true.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
    const ssRes = y_true.reduce(
      (sum, y, i) => sum + (y - y_pred[i]) ** 2,
      0
    );
    const r2 = 1 - ssRes / ssTot;

    return { mae, r2 };
  }

  // ✅ Predict on latest data point
  async predict(currentData) {
    if (!this.model) throw new Error("Model not trained/loaded");

    const features = Array.isArray(currentData)
      ? currentData
      : this.prepareFeatures(currentData, currentData.length - 1);

    const predictedVolatility = (await this.model.predict([features]))[0];
    const currentVolatility =
      currentData.atr || features[0] || predictedVolatility;

    const percentChange =
      ((predictedVolatility - currentVolatility) / currentVolatility) * 100;

    return {
      predictedVolatility,
      volatilityLevel: this.categorizeVolatility(predictedVolatility),
      riskAdjustment: this.calculateRiskAdjustment(predictedVolatility),
      confidence: Math.max(0.5, Math.min(0.99, 1 - this.trainingMetrics.mae)),
      currentVolatility,
      percentChange,
      recommendation: this.getRecommendation(predictedVolatility),
    };
  }

  // ✅ Categorize volatility
  categorizeVolatility(val) {
    if (val < 0.005) return "LOW";
    if (val < 0.01) return "MEDIUM";
    return "HIGH";
  }

  // ✅ Risk adjustment multiplier
  calculateRiskAdjustment(val) {
    if (val < 0.005) return 2.0;
    if (val < 0.01) return 1.2;
    return 0.5;
  }

  // ✅ Recommendation system
  getRecommendation(val) {
    const level = this.categorizeVolatility(val);
    if (level === "LOW") return "INCREASE_POSITION";
    if (level === "MEDIUM") return "HOLD_POSITION";
    return "REDUCE_POSITION";
  }

  // ✅ Save model
  async saveModel(filepath = "./saved-models/volatility-model.json") {
    if (!this.model) throw new Error("No model to save");
    const json = await this.model.toJSON();
    const metadata = {
      trainedAt: new Date().toISOString(),
      trainingMetrics: this.trainingMetrics,
    };
    await fs.promises.writeFile(
      filepath,
      JSON.stringify({ model: json, metadata })
    );
    console.log(`💾 Model saved to ${filepath}`);
  }

  // ✅ Load model
  async loadModel(filepath = "./saved-models/volatility-model.json") {
    const raw = JSON.parse(await fs.promises.readFile(filepath, "utf8"));
    this.model = new xgboost.XGBRegressor();
    await this.model.loadModelFromJSON(raw.model);
    this.trainingMetrics = raw.metadata.trainingMetrics;
    console.log(
      `📂 Model loaded from ${filepath}, trained at ${raw.metadata.trainedAt}`
    );
  }
}

module.exports = VolatilityPredictor;
