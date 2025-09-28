// ml-pipeline/training/data-preprocessor.js
// 🔄 Data Preprocessor for LSTM (Phase 2 Step 1.1 using MTFA output)

const tf = require("@tensorflow/tfjs-node");

class DataPreprocessor {
  constructor(lookback = 60, horizon = 5) {
    this.lookback = lookback;
    this.horizon = horizon;
  }

  /**
   * Preprocess MTFA output into training dataset
   * @param {Array} mtfaData - Array of daily MTFA results with indicators
   */
  createSequences(mtfaData) {
    const features = [];
    const targets = [];

    for (let i = this.lookback; i < mtfaData.length - this.horizon; i++) {
      // 🔹 Build feature window (last 60 days of indicators)
      const featureWindow = [];
      for (let j = i - this.lookback; j < i; j++) {
        featureWindow.push([
          mtfaData[j].close || 0,
          mtfaData[j].ema20 || 0,
          mtfaData[j].rsi14 || 0,
          mtfaData[j].macd?.macd || 0,
          mtfaData[j].atr || 0,
        ]);
      }
      features.push(featureWindow);

      // 🔹 Build target window (next 5 closes)
      const targetWindow = [];
      for (let k = i; k < i + this.horizon; k++) {
        targetWindow.push(mtfaData[k].close || 0);
      }
      targets.push(targetWindow);
    }

    console.log(`📊 Sequences created → Features: ${features.length}, Targets: ${targets.length}`);

    if (!features.length || !targets.length) {
      throw new Error("❌ No sequences generated. Check MTFA data length.");
    }

    return {
      features: tf.tensor3d(features, [features.length, this.lookback, 5]),
      targets: tf.tensor2d(targets, [targets.length, this.horizon])
    };
  }
}

module.exports = DataPreprocessor;
