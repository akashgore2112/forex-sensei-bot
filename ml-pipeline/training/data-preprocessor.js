// ml-pipeline/training/data-preprocessor.js
// 🔄 Data Preprocessor for LSTM - FIXED VERSION

const tf = require("@tensorflow/tfjs-node");

class DataPreprocessor {
  constructor(lookback = 60, horizon = 5) {
    this.lookback = lookback;
    this.horizon = horizon;
  }

  /**
   * Preprocess MTFA output into training dataset
   * @param {Array} mtfaData - Array of daily MTFA candles with indicators
   * Expected keys: { close, ema20, rsi, macd, atr } ✅ FIXED: rsi (not rsi14)
   */
  createSequences(mtfaData) {
    const features = [];
    const targets = [];

    // Validate minimum data length
    const minDataRequired = this.lookback + this.horizon;
    if (mtfaData.length < minDataRequired) {
      throw new Error(
        `❌ Insufficient data: need ${minDataRequired}, got ${mtfaData.length}`
      );
    }

    for (let i = this.lookback; i < mtfaData.length - this.horizon; i++) {
      // 🔹 Build feature window (last N days)
      const featureWindow = [];
      let validWindow = true;

      for (let j = i - this.lookback; j < i; j++) {
        const dp = {
          close: mtfaData[j].close ?? 0,
          ema20: mtfaData[j].ema20 ?? 0,
          rsi: mtfaData[j].rsi ?? 0,      // ✅ FIXED: rsi (consistent naming)
          macd: mtfaData[j].macd ?? 0,     // ✅ FIXED: handle both object and number
          atr: mtfaData[j].atr ?? 0,
        };

        // ✅ Validate all features are valid numbers
        const values = Object.values(dp);
        if (values.some(v => v === undefined || isNaN(v) || !isFinite(v))) {
          console.warn(`⚠️ Invalid feature data at index ${j}:`, dp);
          validWindow = false;
          break;
        }

        featureWindow.push([
          dp.close,
          dp.ema20,
          dp.rsi,
          dp.macd,
          dp.atr,
        ]);
      }

      // Skip this sequence if any invalid data found
      if (!validWindow) continue;

      features.push(featureWindow);

      // 🔹 Build target window (next horizon closes)
      const targetWindow = [];
      let validTarget = true;

      for (let k = i; k < i + this.horizon; k++) {
        const closeVal = mtfaData[k].close ?? 0;
        if (isNaN(closeVal) || !isFinite(closeVal)) {
          console.warn(`⚠️ Invalid target close at index ${k}:`, closeVal);
          validTarget = false;
          break;
        }
        targetWindow.push(closeVal);
      }

      if (!validTarget) {
        features.pop(); // Remove last added feature window
        continue;
      }

      targets.push(targetWindow);
    }

    console.log(`📊 Sequences created → Features: ${features.length}, Targets: ${targets.length}`);

    if (!features.length || !targets.length) {
      throw new Error("❌ No valid sequences generated. Check MTFA data quality.");
    }

    // ✅ Convert arrays → tensors with proper shape validation
    try {
      const featureTensor = tf.tensor3d(features, [features.length, this.lookback, 5]);
      const targetTensor = tf.tensor2d(targets, [targets.length, this.horizon]);
      
      console.log(`✅ Tensor shapes → Features: ${featureTensor.shape}, Targets: ${targetTensor.shape}`);
      
      return { features: featureTensor, targets: targetTensor };
    } catch (err) {
      console.error("❌ Tensor conversion error:", err.message);
      console.error("Sample feature window:", features[0]);
      console.error("Sample target window:", targets[0]);
      throw err;
    }
  }

  /**
   * Split data into train/test sets
   * @param {Object} sequences - {features, targets} tensors
   * @param {number} splitRatio - train split ratio (default 0.8)
   */
  trainTestSplit(sequences, splitRatio = 0.8) {
    const { features, targets } = sequences;
    const totalSamples = features.shape[0];
    const trainSize = Math.floor(totalSamples * splitRatio);

    const trainFeatures = features.slice([0, 0, 0], [trainSize, -1, -1]);
    const trainTargets = targets.slice([0, 0], [trainSize, -1]);
    
    const testFeatures = features.slice([trainSize, 0, 0], [-1, -1, -1]);
    const testTargets = targets.slice([trainSize, 0], [-1, -1]);

    console.log(`📊 Train/Test Split: ${trainSize}/${totalSamples - trainSize}`);

    return {
      train: { features: trainFeatures, targets: trainTargets },
      test: { features: testFeatures, targets: testTargets }
    };
  }
}

module.exports = DataPreprocessor;
