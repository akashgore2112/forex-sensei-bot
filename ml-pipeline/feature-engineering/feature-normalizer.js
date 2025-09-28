// ml-pipeline/feature-engineering/feature-normalizer.js
// 🔄 Feature Normalizer (Min-Max Scaling + Inverse Transform)

class FeatureNormalizer {
  constructor() {
    this.scalers = {}; // store min/max for each feature
    this.fitted = false;
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
    this.fitted = true;
  }

  /**
   * Transform dataset → normalized scale [0,1]
   * @param {Array} data - same format as fit()
   */
  transform(data) {
    if (!this.fitted) {
      this.fit(data); // ✅ auto-fit if not fitted
    }

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
   * Convenience: Normalize in one step (fit + transform)
   */
  normalizeDataset(data) {
    this.fit(data);
    return this.transform(data);
  }

  /**
   * Inverse transform predicted closes back to real price scale
   * @param {number|number[]} prediction - single value or array of normalized closes
   */
  inverseTransformClose(prediction) {
    if (!this.fitted) throw new Error("❌ Normalizer not fitted yet.");
    const { min, max } = this.scalers["close"];

    if (Array.isArray(prediction)) {
      return prediction.map((p) => p * (max - min) + min);
    } else {
      return prediction * (max - min) + min;
    }
  }
}

module.exports = FeatureNormalizer;
