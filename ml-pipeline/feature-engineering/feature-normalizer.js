// ml-pipeline/feature-engineering/feature-normalizer.js
// 🔄 Feature Normalizer (Min-Max Scaling + Inverse Transform)

class FeatureNormalizer {
  constructor() {
    this.scalers = {}; // store min/max for each feature
  }

  /**
   * Fit scalers on historical dataset
   * @param {Array} data - Array of objects with features
   * e.g. { close, ema20, rsi, macd, atr }
   */
  fit(data) {
    const keys = ["close", "ema20", "rsi", "macd", "atr"];
    keys.forEach((key) => {
      const values = data.map((d) => d[key] ?? 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      this.scalers[key] = { min, max };
    });
  }

  /**
   * Transform dataset → normalized scale [0,1]
   * @param {Array} data - same format as fit()
   */
  transform(data) {
    return data.map((d) => {
      const normalized = {};
      for (const key of Object.keys(this.scalers)) {
        const { min, max } = this.scalers[key];
        normalized[key] = max > min ? (d[key] - min) / (max - min) : 0.5;
      }
      return normalized;
    });
  }

  /**
   * Inverse transform single prediction (back to real scale)
   * @param {number[]} prediction - array of normalized predicted closes
   */
  inverseTransformClose(prediction) {
    const { min, max } = this.scalers["close"];
    return prediction.map((p) => p * (max - min) + min);
  }
}

module.exports = FeatureNormalizer;
