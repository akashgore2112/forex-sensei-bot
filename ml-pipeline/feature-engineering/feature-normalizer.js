// ml-pipeline/feature-engineering/feature-normalizer.js
// 🔄 Feature Normalizer - IMPROVED VERSION with Better Error Handling

class FeatureNormalizer {
  constructor() {
    this.scalers = {}; // store min/max for each feature
    this.fitted = false;
    this.expectedKeys = ["close", "ema20", "rsi", "macd", "atr"]; // ✅ Standard features
  }

  /**
   * Fit scalers on historical dataset
   * @param {Array} data - Array of objects with features
   * e.g. { close, ema20, rsi, macd, atr }
   */
  fit(data) {
    if (!data || data.length === 0) {
      throw new Error("❌ Cannot fit normalizer: data is empty");
    }

    // ✅ Detect available keys from first data point
    const availableKeys = Object.keys(data[0]).filter(key => 
      this.expectedKeys.includes(key)
    );

    if (availableKeys.length === 0) {
      throw new Error(
        `❌ No valid features found. Expected: ${this.expectedKeys.join(", ")}`
      );
    }

    // ✅ Fit scaler for each available key
    availableKeys.forEach((key) => {
      const values = data
        .map((d) => d[key])
        .filter(v => v != null && !isNaN(v) && isFinite(v)); // Filter invalid values

      if (values.length === 0) {
        console.warn(`⚠️ No valid values for feature: ${key}, skipping...`);
        return;
      }

      const min = Math.min(...values);
      const max = Math.max(...values);

      // ✅ Handle case where all values are same (min === max)
      if (min === max) {
        console.warn(`⚠️ Feature '${key}' has constant value: ${min}`);
        this.scalers[key] = { min: min, max: min + 1 }; // Avoid division by zero
      } else {
        this.scalers[key] = { min, max };
      }
    });

    this.fitted = true;
    console.log(`✅ Normalizer fitted with features: ${Object.keys(this.scalers).join(", ")}`);
  }

  /**
   * Transform dataset → normalized scale [0,1]
   * @param {Array} data - same format as fit()
   * @returns {Array} normalized data
   */
  transform(data) {
    if (!this.fitted) {
      console.warn("⚠️ Normalizer not fitted yet. Auto-fitting...");
      this.fit(data);
    }

    if (!data || data.length === 0) {
      throw new Error("❌ Cannot transform: data is empty");
    }

    return data.map((d, index) => {
      const normalized = {};
      
      for (const key of Object.keys(this.scalers)) {
        const value = d[key];
        const { min, max } = this.scalers[key];

        // ✅ Handle missing/invalid values
        if (value == null || isNaN(value) || !isFinite(value)) {
          console.warn(`⚠️ Invalid value for ${key} at index ${index}: ${value}, using 0.5`);
          normalized[key] = 0.5; // Default to middle
          continue;
        }

        // ✅ Normalize to [0, 1]
        normalized[key] = max > min ? (value - min) / (max - min) : 0.5;
      }
      
      return normalized;
    });
  }

  /**
   * Convenience: Normalize in one step (fit + transform)
   * @param {Array} data - training dataset
   * @returns {Array} normalized data
   */
  normalizeDataset(data) {
    this.fit(data);
    return this.transform(data);
  }

  /**
   * Inverse transform predicted closes back to real price scale
   * @param {number|number[]} prediction - single value or array of normalized closes
   * @returns {number|number[]} denormalized price(s)
   */
  inverseTransformClose(prediction) {
    if (!this.fitted) {
      throw new Error("❌ Normalizer not fitted yet. Call fit() first.");
    }

    if (!this.scalers["close"]) {
      throw new Error("❌ 'close' feature not found in fitted scalers");
    }

    const { min, max } = this.scalers["close"];

    // ✅ Handle both single value and array
    if (Array.isArray(prediction)) {
      return prediction.map((p) => {
        if (isNaN(p) || !isFinite(p)) {
          console.warn(`⚠️ Invalid prediction value: ${p}`);
          return min; // Return minimum as fallback
        }
        return p * (max - min) + min;
      });
    } else {
      if (isNaN(prediction) || !isFinite(prediction)) {
        console.warn(`⚠️ Invalid prediction value: ${prediction}`);
        return min;
      }
      return prediction * (max - min) + min;
    }
  }

  /**
   * Get scaling parameters for a specific feature
   * @param {string} featureName - name of feature
   * @returns {Object} {min, max} or null if not fitted
   */
  getScaler(featureName) {
    return this.scalers[featureName] || null;
  }

  /**
   * Check if normalizer is fitted and ready
   * @returns {boolean}
   */
  isFitted() {
    return this.fitted && Object.keys(this.scalers).length > 0;
  }

  /**
   * Reset the normalizer (clear all fitted scalers)
   */
  reset() {
    this.scalers = {};
    this.fitted = false;
    console.log("✅ Normalizer reset");
  }

  /**
   * Save scaler parameters to object (for serialization)
   * @returns {Object} scaler state
   */
  toJSON() {
    return {
      scalers: this.scalers,
      fitted: this.fitted,
      expectedKeys: this.expectedKeys
    };
  }

  /**
   * Load scaler parameters from object
   * @param {Object} state - saved scaler state
   */
  fromJSON(state) {
    this.scalers = state.scalers || {};
    this.fitted = state.fitted || false;
    this.expectedKeys = state.expectedKeys || this.expectedKeys;
    console.log("✅ Normalizer loaded from saved state");
  }
}

module.exports = FeatureNormalizer;
