// ml-pipeline/training/data-preprocessor.js
// 🔄 Data Preprocessor for LSTM (Phase 2 Step 1.1 using MTFA output + Normalization Ready)

const tf = require("@tensorflow/tfjs-node");

class DataPreprocessor {
  constructor(lookback = 60, horizon = 5) {
    this.lookback = lookback;
    this.horizon = horizon;
  }

  /**
   * Preprocess MTFA output into training dataset
   * @param {Array} mtfaData - Array of daily MTFA candles with indicators
   * Expected keys: { close, ema20, rsi14, macd, atr }
   */
  createSequences(mtfaData) {
    const features = [];
    const targets = [];

    for (let i = this.lookback; i < mtfaData.length - this.horizon; i++) {
      // 🔹 Build feature window (last N days)
      const featureWindow = [];
      for (let j = i - this.lookback; j < i; j++) {
        const dp = {
          close: mtfaData[j].close ?? 0,
          ema20: mtfaData[j].ema20 ?? 0,
          rsi14: mtfaData[j].rsi14 ?? 0,
          macd: mtfaData[j].macd?.macd ?? 0,
          atr: mtfaData[j].atr ?? 0,
        };

        // Debug for invalid values
        if (Object.values(dp).some(v => v === undefined || isNaN(v))) {
          console.warn(`⚠️ Invalid feature data at index ${j}:`, dp);
        }

        featureWindow.push([
          dp.close,
          dp.ema20,
          dp.rsi14,
          dp.macd,
          dp.atr,
        ]);
      }
      features.push(featureWindow);

      // 🔹 Build target window (next horizon closes)
      const targetWindow = [];
      for (let k = i; k < i + this.horizon; k++) {
        const closeVal = mtfaData[k].close ?? 0;
        if (isNaN(closeVal)) {
          console.warn(`⚠️ Invalid target close at index ${k}:`, mtfaData[k]);
        }
        targetWindow.push(closeVal);
      }
      targets.push(targetWindow);
    }

    console.log(`📊 Sequences created → Features: ${features.length}, Targets: ${targets.length}`);

    if (!features.length || !targets.length) {
      throw new Error("❌ No sequences generated. Check MTFA data length.");
    }

    // ✅ Convert arrays → tensors
    try {
      const featureTensor = tf.tensor3d(features, [features.length, this.lookback, 5]);
      const targetTensor = tf.tensor2d(targets, [targets.length, this.horizon]);
      return { features: featureTensor, targets: targetTensor };
    } catch (err) {
      console.error("❌ Tensor conversion error:", err.message);
      console.error("Sample bad feature window:", features[0]);
      console.error("Sample bad target window:", targets[0]);
      throw err;
    }
  }
}

module.exports = DataPreprocessor;
