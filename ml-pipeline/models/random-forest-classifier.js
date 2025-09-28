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
  }

  // ✅ NaN-safe number parser
  safeNumber(v) {
    if (v === null || v === undefined || isNaN(v)) return 0;
    return Number(v);
  }

  prepareFeatures(marketData) {
    return {
      ema_trend: this.safeNumber(this.calculateEMATrend(marketData)),
      rsi_level: this.safeNumber(this.normalizeRSI(marketData.rsi)),
      macd_signal: this.safeNumber(this.getMACDSignal(marketData.macd)),
      atr_volatility: this.safeNumber(this.normalizeATR(marketData.atr)),
      price_position: this.safeNumber(this.getPricePosition(marketData)),
      momentum_strength: this.safeNumber(this.calculateMomentum(marketData)),
      volume_trend: this.safeNumber(this.getVolumeTrend(marketData)),
    };
  }

  async trainModel(historicalData) {
    const trainingData = [];
    const labels = [];

    for (let i = 100; i < historicalData.length - 10; i++) {
      const currentData = historicalData[i];
      const features = this.prepareFeatures(currentData);

      // Look ahead 5 days for price movement
      const futurePrice = historicalData[i + 5]?.close;
      const currentPrice = currentData.close;
      if (!futurePrice || !currentPrice) continue;

      const priceChange = (futurePrice - currentPrice) / currentPrice;

      let label;
      if (priceChange > 0.01) label = "BUY";
      else if (priceChange < -0.01) label = "SELL";
      else label = "HOLD";

      const featureArray = Object.values(features);

      // ✅ Strict feature length check
      if (featureArray.length !== this.features.length) {
        console.warn(`⚠️ Skipped sample at index ${i}: Invalid feature length`, featureArray);
        continue;
      }

      trainingData.push(featureArray);
      labels.push(label);
    }

    // ✅ Guard clause
    if (!trainingData.length || !labels.length) {
      throw new Error("❌ No valid training data for Random Forest.");
    }

    // 📊 Debug distribution
    const dist = labels.reduce((acc, l) => {
      acc[l] = (acc[l] || 0) + 1;
      return acc;
    }, {});
    console.log(`📊 Training distribution:`, dist);

    console.log(
      `📊 Training Random Forest → Samples: ${trainingData.length}, Features: ${this.features.length}`
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

  predict(currentData) {
    if (!this.model) throw new Error("❌ Model not trained.");

    const features = this.prepareFeatures(currentData);
    const featureArray = [Object.values(features)];

    if (featureArray[0].length !== this.features.length) {
      throw new Error(`❌ Invalid feature length at prediction: ${featureArray[0].length}`);
    }

    const prediction = this.model.predict(featureArray);
    const probabilities = this.model.predictProba(featureArray);

    return {
      signal: prediction[0],
      confidence: Math.max(...probabilities[0]),
      probabilities: {
        BUY: probabilities[0][0],
        SELL: probabilities[0][1],
        HOLD: probabilities[0][2],
      },
    };
  }

  // 🟢 Placeholder methods
  calculateEMATrend(data) {
    return data.ema20 > data.ema50 ? 1 : -1;
  }
  normalizeRSI(rsi) {
    return (rsi ?? 50) / 100; // default neutral = 0.5
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
