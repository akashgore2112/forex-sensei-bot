// ml-pipeline/models/volatility-predictor.js
// 📊 Volatility Predictor using XGBoost Regression
// Goal: Predict future 5-day volatility (ATR-based) and classify into Low/Medium/High

const { XGBoostRegressor } = require("ml-xgboost"); // npm install ml-xgboost
const fs = require("fs");

class VolatilityPredictor {
  constructor() {
    this.model = null;
    this.trainingMetrics = null;
  }

  // ✅ Safe number handling
  safeNumber(v, fallback = 0) {
    if (v === null || v === undefined || isNaN(v)) return fallback;
    return Number(v);
  }

  // ✅ Extract features for volatility prediction
  prepareFeatures(data, i) {
    const current = data[i];
    const prev = data[i - 1] || current;

    const currentATR = this.safeNumber(current.atr);
    const prevATR = this.safeNumber(prev.atr, currentATR);

    return [
      currentATR, // current ATR
      (currentATR - prevATR) / (prevATR || 1), // ATR change
      (current.high - current.low) / (current.close || 1), // intraday range
      i > 1 ? (current.rsi - data[i - 1].rsi) : 0, // RSI velocity
      current.avgVolume ? (current.volume / current.avgVolume) : 1, // volume spike
      this.countRecentSwings(data, i, 10), // swings in last 10 days
      this.safeNumber(current.adx) // ADX as trend strength
    ];
  }

  // ✅ Count price swings in last N candles
  countRecentSwings(data, i, lookback = 10) {
    let swings = 0;
    for (let j = i - lookback + 1; j < i; j++) {
      if (j <= 0) continue;
      const change = Math.abs((data[j].close - data[j - 1].close) / data[j - 1].close);
      if (change > 0.003) swings++; // >0.3% move counts as swing
    }
    return swings;
  }

  // ✅ Calculate future volatility (target = avg ATR next 5 days)
  calculateFutureVolatility(data, i, horizon = 5) {
    const futureSlice = data.slice(i + 1, i + 1 + horizon);
    if (futureSlice.length < horizon) return null;

    const avgATR = futureSlice.reduce((sum, d) => sum + this.safeNumber(d.atr), 0) / horizon;
    return avgATR;
  }

  // ✅ Train XGBoost regression model
  async trainModel(historicalData) {
    const features = [];
    const targets = [];

    for (let i = 20; i < historicalData.length - 5; i++) {
      const f = this.prepareFeatures(historicalData, i);
      const t = this.calculateFutureVolatility(historicalData, i);

      if (t !== null && f.every(v => !isNaN(v))) {
        features.push(f);
        targets.push(t);
      }
    }

    if (features.length < 100) {
      throw new Error(`❌ Not enough samples to train Volatility Predictor (got ${features.length})`);
    }

    // Split train/test
    const splitIndex = Math.floor(features.length * 0.8);
    const trainX = features.slice(0, splitIndex);
    const trainY = targets.slice(0, splitIndex);
    const testX = features.slice(splitIndex);
    const testY = targets.slice(splitIndex);

    // Train model
    this.model = new XGBoostRegressor({
      nEstimators: 200,
      maxDepth: 6,
      learningRate: 0.1
    });

    await this.model.train(trainX, trainY);

    // Evaluate performance (MAE)
    const preds = await this.model.predict(testX);
    const errors = preds.map((p, i) => Math.abs(p - testY[i]));
    const mae = errors.reduce((a, b) => a + b, 0) / errors.length;

    this.trainingMetrics = {
      samples: features.length,
      mae,
      avgATR: testY.reduce((a, b) => a + b, 0) / testY.length,
      maePercent: (mae / (testY.reduce((a, b) => a + b, 0) / testY.length)) * 100
    };

    console.log(`✅ Volatility Predictor trained. MAE: ${this.trainingMetrics.mae.toFixed(5)} (${this.trainingMetrics.maePercent.toFixed(2)}%)`);

    return this.trainingMetrics;
  }

  // ✅ Predict volatility for a single datapoint
  async predict(currentData) {
    if (!this.model) throw new Error("❌ Model not trained or loaded.");

    const features = this.prepareFeatures(currentData, currentData.length - 1);
    const predictedVol = (await this.model.predict([features]))[0];
    const currentATR = this.safeNumber(currentData[currentData.length - 1].atr);

    const volatilityLevel = this.categorizeVolatility(predictedVol, currentATR);
    const riskAdjustment = this.calculateRiskAdjustment(volatilityLevel);

    return {
      predictedVolatility: predictedVol,
      volatilityLevel,
      riskAdjustment,
      confidence: 1 - (this.trainingMetrics?.maePercent || 0.25), // 1 - MAE ratio
      currentVolatility: currentATR,
      percentChange: ((predictedVol - currentATR) / currentATR) * 100,
      recommendation: riskAdjustment > 1 ? "REDUCE_POSITION" : "INCREASE_POSITION"
    };
  }

  // ✅ Categorize volatility into LOW / MEDIUM / HIGH
  categorizeVolatility(predictedATR, price) {
    const ratio = predictedATR / (price || 1);
    if (ratio < 0.005) return "LOW";
    if (ratio < 0.01) return "MEDIUM";
    return "HIGH";
  }

  // ✅ Risk adjustment factor based on volatility
  calculateRiskAdjustment(level) {
    switch (level) {
      case "LOW": return 1.5;
      case "MEDIUM": return 1.0;
      case "HIGH": return 0.5;
      default: return 1.0;
    }
  }

  // ✅ Save model
  async saveModel(filepath = "./saved-models/volatility-model.json") {
    if (!this.model) throw new Error("No model to save");

    const modelData = {
      model: await this.model.toJSON(),
      trainingMetrics: this.trainingMetrics,
      metadata: { trainedAt: new Date().toISOString() }
    };

    await fs.promises.writeFile(filepath, JSON.stringify(modelData));
    console.log(`💾 Volatility model saved → ${filepath}`);
  }

  // ✅ Load model
  async loadModel(filepath = "./saved-models/volatility-model.json") {
    const raw = await fs.promises.readFile(filepath, "utf8");
    const modelData = JSON.parse(raw);

    this.model = await XGBoostRegressor.fromJSON(modelData.model);
    this.trainingMetrics = modelData.trainingMetrics;

    console.log(`📂 Volatility model loaded → ${filepath}`);
    if (this.trainingMetrics) {
      console.log(`Previous MAE: ${this.trainingMetrics.mae.toFixed(5)} (${this.trainingMetrics.maePercent.toFixed(2)}%)`);
    }
  }
}

module.exports = VolatilityPredictor;
