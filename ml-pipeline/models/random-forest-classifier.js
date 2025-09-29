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

  // ✅ Safe number parser
  safeNumber(v) {
    if (v === null || v === undefined || isNaN(v)) return 0;
    return Number(v);
  }

  // ✅ Prepare single feature vector
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

  // ✅ Train model
  async trainModel(historicalData) {
    const trainingData = [];
    const labels = [];

    for (let i = 100; i < historicalData.length - 10; i++) {
      const currentData = historicalData[i];
      const features = this.prepareFeatures(currentData);

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

    console.log(
      `📊 Training Random Forest → Samples: ${trainingData.length}, Features per sample: ${trainingData[0].length}`
    );
    console.log(
      `📊 Label Distribution: BUY=${labels.filter(l => l === 0).length}, SELL=${labels.filter(l => l === 1).length}, HOLD=${labels.filter(l => l === 2).length}`
    );

    this.model = new RandomForestClassifier({
      nEstimators: 100,
      maxFeatures: 0.8,
      replacement: false,
      seed: 42,
    });

    this.model.train(trainingData, labels);
    console.log("✅ Random Forest Training Completed!");
  }

  // ✅ Predict with manual probability calculation
  predict(currentData) {
    if (!this.model) throw new Error("❌ Model not trained.");
    const features = this.prepareFeatures(currentData);

    if (features.length !== 7) {
      throw new Error("❌ Invalid feature length for prediction.");
    }

    // Raw votes from all trees
    const votes = this.model.estimators.map(tree => tree.predict([features])[0]);

    // Count votes for each label
    const counts = { 0: 0, 1: 0, 2: 0 };
    votes.forEach(v => counts[v]++);

    // Normalize counts → probabilities
    const total = votes.length;
    const probabilities = [
      counts[0] / total, // BUY
      counts[1] / total, // SELL
      counts[2] / total  // HOLD
    ];

    // Pick final signal
    const predictionIdx = probabilities.indexOf(Math.max(...probabilities));

    return {
      signal: this.reverseLabel[predictionIdx],
      confidence: Math.max(...probabilities),
      probabilities: {
        BUY: probabilities[0],
        SELL: probabilities[1],
        HOLD: probabilities[2],
      },
    };
  }

  // === Placeholder helpers ===
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
