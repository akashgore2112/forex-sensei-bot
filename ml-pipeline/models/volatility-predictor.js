// ml-pipeline/models/volatility-predictor.js
const fs = require("fs");
const XGBoost = require("ml-xgboost");

class VolatilityPredictor {
  constructor() {
    this.model = null;
    this.normalizer = null;
  }

  // ============= FEATURE ENGINEERING =============
  prepareFeatures(data, index) {
    const c = data[index];
    const prev = data[index - 1] || c;

    const atrChange = prev.atr ? (c.atr - prev.atr) / prev.atr : 0;
    const priceRange = (c.high - c.low) / (c.close || 1);
    const rsiVelocity = prev.rsi ? (c.rsi - prev.rsi) / prev.rsi : 0;
    const volumeSpike = c.avgVolume ? c.volume / c.avgVolume : 1;
    const recentSwings = this.calculateRecentSwings(data, index, 10);
    const trendStrength = c.adx || 0;

    return [
      c.atr,
      atrChange,
      priceRange,
      rsiVelocity,
      volumeSpike,
      recentSwings,
      trendStrength
    ];
  }

  calculateRecentSwings(data, index, lookback) {
    if (index < lookback) return 0;
    let swings = 0;
    for (let i = index - lookback; i < index; i++) {
      const up = data[i].close > data[i - 1]?.close;
      const down = data[i].close < data[i - 1]?.close;
      if (up || down) swings++;
    }
    return swings;
  }

  calculateFutureVolatility(data, index, horizon = 5) {
    if (index + horizon >= data.length) return null;
    const future = data.slice(index + 1, index + 1 + horizon);
    const avgATR = future.reduce((sum, d) => sum + (d.atr || 0), 0) / future.length;
    return avgATR;
  }

  categorizeVolatility(vol) {
    if (!vol || vol <= 0) return "LOW";
    if (vol < 0.005) return "LOW";
    if (vol < 0.01) return "MEDIUM";
    return "HIGH";
  }

  calculateRiskAdjustment(vol) {
    if (vol < 0.005) return 0.5;
    if (vol < 0.01) return 1.0;
    return 1.5;
  }

  // ============= TRAINING =============
  async trainModel(historicalData) {
    const X = [];
    const y = [];

    for (let i = 20; i < historicalData.length - 5; i++) {
      const features = this.prepareFeatures(historicalData, i);
      const target = this.calculateFutureVolatility(historicalData, i);
      if (!target) continue;

      X.push(features);
      y.push(target);
    }

    if (X.length === 0) throw new Error("No valid training samples!");

    // Train/test split
    const split = Math.floor(X.length * 0.8);
    const trainX = X.slice(0, split);
    const trainY = y.slice(0, split);
    const testX = X.slice(split);
    const testY = y.slice(split);

    console.log(`Training samples: ${trainX.length}, Test samples: ${testX.length}`);

    this.model = new XGBoost.XGBoostRegressor({
      maxDepth: 6,
      nEstimators: 200,
      learningRate: 0.1
    });

    await this.model.fit(trainX, trainY);

    // Evaluate
    const preds = await this.model.predict(testX);
    const metrics = this.evaluate(testY, preds);

    this.trainingMetrics = metrics;
    console.log("📊 Volatility Model Evaluation:", metrics);

    return metrics;
  }

  evaluate(yTrue, yPred) {
    const n = yTrue.length;
    const mae = yTrue.reduce((sum, val, i) => sum + Math.abs(val - yPred[i]), 0) / n;
    const mean = yTrue.reduce((a, b) => a + b, 0) / n;
    const ssRes = yTrue.reduce((sum, val, i) => sum + Math.pow(val - yPred[i], 2), 0);
    const ssTot = yTrue.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const r2 = 1 - ssRes / ssTot;

    // Classification accuracy check
    let correct = 0;
    for (let i = 0; i < n; i++) {
      if (this.categorizeVolatility(yTrue[i]) === this.categorizeVolatility(yPred[i])) {
        correct++;
      }
    }
    const classAcc = correct / n;

    return { mae, r2, classAcc };
  }

  // ============= PREDICTION =============
  async predict(currentData) {
    if (!this.model) throw new Error("Model not trained");

    const features = this.prepareFeatures(currentData, currentData.length - 1);
    const predVol = (await this.model.predict([features]))[0];

    const level = this.categorizeVolatility(predVol);
    const riskAdj = this.calculateRiskAdjustment(predVol);

    return {
      predictedVolatility: predVol,
      volatilityLevel: level,
      riskAdjustment: riskAdj,
      confidence: this.trainingMetrics?.r2 || 0.7,
      currentVolatility: currentData[currentData.length - 1].atr,
      percentChange: ((predVol - currentData[currentData.length - 1].atr) /
        (currentData[currentData.length - 1].atr || 1)) * 100,
      recommendation: riskAdj > 1.2 ? "REDUCE_POSITION" : "NORMAL"
    };
  }

  // ============= SAVE / LOAD =============
  async saveModel(filepath = "./saved-models/volatility-model.json") {
    if (!this.model) throw new Error("No model to save");
    const modelData = await this.model.toJSON();
    const payload = {
      model: modelData,
      trainingMetrics: this.trainingMetrics,
      metadata: { trainedAt: new Date().toISOString() }
    };
    await fs.promises.writeFile(filepath, JSON.stringify(payload));
    console.log(`Model saved → ${filepath}`);
  }

  async loadModel(filepath = "./saved-models/volatility-model.json") {
    const payload = JSON.parse(await fs.promises.readFile(filepath, "utf8"));
    this.model = new XGBoost.XGBoostRegressor();
    await this.model.fromJSON(payload.model);
    this.trainingMetrics = payload.trainingMetrics;
    console.log(`Model loaded → ${filepath} (Trained at ${payload.metadata.trainedAt})`);
  }
}

module.exports = VolatilityPredictor;
