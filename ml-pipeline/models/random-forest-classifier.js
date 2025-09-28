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
    let skipped = 0;

    for (let i = 100; i < historicalData.length - 10; i++) {
      const currentData = historicalData[i];
      const features = this.prepareFeatures(currentData);

      const featureArray = Object.values(features);
      if (featureArray.length !== this.features.length) {
        console.warn(`⚠️ Skipped sample index ${i}: feature length mismatch`);
        skipped++;
        continue;
      }

      const futurePrice = historicalData[i + 5]?.close;
      const currentPrice = currentData.close;
      if (!futurePrice || !currentPrice) {
        skipped++;
        continue;
      }

      const priceChange = (futurePrice - currentPrice) / currentPrice;

      let label;
      if (priceChange > 0.01) label = "BUY";
      else if (priceChange < -0.01) label = "SELL";
      else label = "HOLD";

      if (!label) {
        console.warn(`⚠️ Skipped sample index ${i}: invalid label`);
        skipped++;
        continue;
      }

      trainingData.push(featureArray);
      labels.push(label);
    }

    if (!trainingData.length || !labels.length) {
      throw new Error("❌ No valid training data for Random Forest.");
    }

    console.log(
      `📊 Training Random Forest → Samples: ${trainingData.length}, Features: ${this.features.length}, Skipped: ${skipped}`
    );

    // ✅ Print label distribution
    const dist = labels.reduce((acc, l) => {
      acc[l] = (acc[l] || 0) + 1;
      return acc;
    }, {});
    console.log("📊 Label distribution:", dist);

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
