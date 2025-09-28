// ml-pipeline/models/random-forest-classifier.js
// 📘 Random Forest Classifier (Phase 2 - Step 1.2)
// Goal: Generate BUY / SELL / HOLD signals using MTFA features

const { RandomForestClassifier } = require("ml-random-forest");

class SwingSignalClassifier {
  constructor() {
    this.model = null;

    // Feature set for signal classification
    this.features = [
      "ema_trend",
      "rsi_level",
      "macd_signal",
      "atr_volatility",
      "price_position",
      "momentum_strength",
      "volume_trend",
    ];
  }

  // 🔹 Feature Engineering Helpers
  calculateEMATrend(marketData) {
    if (!marketData.ema20 || !marketData.ema50 || !marketData.ema200) return 0;
    if (marketData.ema20 > marketData.ema50 && marketData.ema50 > marketData.ema200) return 1; // bullish
    if (marketData.ema20 < marketData.ema50 && marketData.ema50 < marketData.ema200) return -1; // bearish
    return 0; // neutral
  }

  normalizeRSI(rsi) {
    if (rsi == null) return 0.5;
    return Math.min(1, Math.max(0, rsi / 100)); // scale 0–1
  }

  getMACDSignal(macd) {
    if (!macd || macd.macd == null || macd.signal == null) return 0;
    return macd.macd > macd.signal ? 1 : -1;
  }

  normalizeATR(atr) {
    if (!atr || atr <= 0) return 0;
    return Math.min(1, atr / 0.05); // ATR normalized (assume 5% as high volatility)
  }

  getPricePosition(marketData) {
    if (!marketData.bollinger) return 0.5;
    const { upper, lower } = marketData.bollinger;
    if (!upper || !lower) return 0.5;
    return (marketData.close - lower) / (upper - lower); // 0=low band, 1=upper band
  }

  calculateMomentum(marketData) {
    if (!marketData.close || !marketData.prevClose) return 0;
    return (marketData.close - marketData.prevClose) / marketData.prevClose;
  }

  getVolumeTrend(marketData) {
    if (!marketData.volume || !marketData.avgVolume) return 0;
    return marketData.volume > marketData.avgVolume ? 1 : -1;
  }

  // 🔹 Prepare Feature Vector
  prepareFeatures(marketData) {
    return {
      ema_trend: this.calculateEMATrend(marketData),
      rsi_level: this.normalizeRSI(marketData.rsi14),
      macd_signal: this.getMACDSignal(marketData.macd),
      atr_volatility: this.normalizeATR(marketData.atr),
      price_position: this.getPricePosition(marketData),
      momentum_strength: this.calculateMomentum(marketData),
      volume_trend: this.getVolumeTrend(marketData),
    };
  }

  // 🔹 Train Model on Historical Data
  async trainModel(historicalData) {
    const trainingData = [];
    const labels = [];

    for (let i = 100; i < historicalData.length - 10; i++) {
      const currentData = historicalData[i];
      const features = this.prepareFeatures(currentData);

      // Lookahead 5 days for signal label
      const futurePrice = historicalData[i + 5].close;
      const currentPrice = currentData.close;
      const priceChange = (futurePrice - currentPrice) / currentPrice;

      let label;
      if (priceChange > 0.01) label = "BUY";
      else if (priceChange < -0.01) label = "SELL";
      else label = "HOLD";

      trainingData.push(Object.values(features));
      labels.push(label);
    }

    this.model = new RandomForestClassifier({
      nEstimators: 100,
      maxFeatures: 0.8,
      replacement: false,
      seed: 42,
    });

    this.model.train(trainingData, labels);
    console.log("✅ Random Forest Classifier Trained Successfully");
  }

  // 🔹 Predict Signal for Current Market Data
  predict(currentData) {
    if (!this.model) throw new Error("❌ Model not trained yet!");

    const features = this.prepareFeatures(currentData);
    const prediction = this.model.predict([Object.values(features)]);
    const probabilities = this.model.predictProba([Object.values(features)]);

    return {
      signal: prediction[0], // BUY/SELL/HOLD
      confidence: Math.max(...probabilities[0]),
      probabilities: {
        BUY: probabilities[0][0],
        SELL: probabilities[0][1],
        HOLD: probabilities[0][2],
      },
    };
  }
}

module.exports = SwingSignalClassifier;
