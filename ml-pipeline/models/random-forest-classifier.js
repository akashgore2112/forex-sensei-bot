// ml-pipeline/models/random-forest-classifier.js
const { RandomForestClassifier } = require("ml-random-forest");

class SwingSignalClassifier {
  constructor() {
    this.model = null;
    this.features = [
      "ema_trend",
      "rsi_level",
      "macd_signal",
      "atr_volatility",
      "price_position",
      "momentum_strength",
      "volume_trend",
    ];
    this.labelMap = { BUY: 0, SELL: 1, HOLD: 2 };
    this.reverseLabel = ["BUY", "SELL", "HOLD"];
  }

  // ✅ NaN-safe conversion
  safeNumber(v) {
    if (v === null || v === undefined || isNaN(v)) return 0;
    return Number(v);
  }

  // ✅ Convert market data → features
  prepareFeatures(marketData) {
    return [
      this.safeNumber(this.calculateEMATrend(marketData)),
      this.safeNumber(this.normalizeRSI(marketData.rsi)),
      this.safeNumber(this.getMACDSignal(marketData.macd)),
      this.safeNumber(this.normalizeATR(marketData.atr)),
      this.safeNumber(this.getPricePosition(marketData)),
      this.safeNumber(this.calculateMomentum(marketData)),
      this.safeNumber(this.getVolumeTrend(marketData)),
    ];
  }

  // ✅ Train model with balancing
  async trainModel(historicalData) {
    const trainingData = [];
    const labels = [];

    for (let i = 100; i < historicalData.length - 10; i++) {
      const currentData = historicalData[i];
      const features = this.prepareFeatures(currentData);

      // Feature sanity check
      if (features.length !== 7 || features.some(v => v === undefined || Number.isNaN(v))) {
        continue;
      }

      const futurePrice = historicalData[i + 5]?.close;
      const currentPrice = currentData.close;
      if (!futurePrice || !currentPrice) continue;

      const priceChange = (futurePrice - currentPrice) / currentPrice;
      let label = "HOLD";
      if (priceChange > 0.01) label = "BUY";
      else if (priceChange < -0.01) label = "SELL";

      trainingData.push(features);
      labels.push(this.labelMap[label]);
    }

    if (!trainingData.length || !labels.length) {
      throw new Error("❌ No valid training data for Random Forest.");
    }

    // 📊 Show training stats
    console.log(
      `📊 Training Random Forest → Samples: ${trainingData.length}, Features per sample: ${trainingData[0].length}`
    );
    console.log(
      `📊 Label Distribution (raw): BUY=${labels.filter(l => l === 0).length}, SELL=${labels.filter(l => l === 1).length}, HOLD=${labels.filter(l => l === 2).length}`
    );

    // ✅ Compute class weights (inverse frequency)
    const total = labels.length;
    const classCounts = {
      0: labels.filter(l => l === 0).length, // BUY
      1: labels.filter(l => l === 1).length, // SELL
      2: labels.filter(l => l === 2).length, // HOLD
    };

    const classWeights = {
      0: total / (3 * (classCounts[0] || 1)),
      1: total / (3 * (classCounts[1] || 1)),
      2: total / (3 * (classCounts[2] || 1)),
    };

    console.log("⚖️ Class Weights Applied:", classWeights);

    // ✅ Train Random Forest
    this.model = new RandomForestClassifier({
      nEstimators: 100,
      maxFeatures: 0.8,
      replacement: false,
      seed: 42,
      useSampleBagging: true,
    });

    this.model.train(trainingData, labels, { weights: labels.map(l => classWeights[l]) });

    console.log("✅ Random Forest Training Completed!");
  }

  // ✅ Predict BUY/SELL/HOLD
  predict(currentData) {
    if (!this.model) throw new Error("❌ Model not trained.");
    const features = this.prepareFeatures(currentData);

    if (features.length !== 7) {
      throw new Error("❌ Invalid feature length for prediction.");
    }

    const predictionIdx = this.model.predict([features])[0];
    let probabilities = { BUY: 0, SELL: 0, HOLD: 0 };

    // `predictProba` check (if available)
    if (typeof this.model.predictProba === "function") {
      const proba = this.model.predictProba([features])[0];
      probabilities = {
        BUY: proba[0],
        SELL: proba[1],
        HOLD: proba[2],
      };
    }

    return {
      signal: this.reverseLabel[predictionIdx],
      confidence: probabilities[this.reverseLabel[predictionIdx]] || 1.0,
      probabilities,
    };
  }

  // === Indicator helpers ===
  calculateEMATrend(data) {
    return data.ema20 > data.ema50 ? 1 : -1;
  }
  normalizeRSI(rsi) {
    return rsi / 100;
  }
  getMACDSignal(macd) {
    return (macd?.macd || 0) - (macd?.signal || 0);
  }
  normalizeATR(atr) {
    return atr || 0;
  }
  getPricePosition(data) {
    return data.close / (data.ema20 || 1);
  }
  calculateMomentum(data) {
    return (data.close - (data.prevClose || data.close)) / (data.prevClose || 1);
  }
  getVolumeTrend(data) {
    return data.volume ? data.volume / (data.avgVolume || data.volume) : 0;
  }
}

module.exports = SwingSignalClassifier;
