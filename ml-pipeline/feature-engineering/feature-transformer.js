// ============================================================================
// ⚙️ Feature Transformer (Phase 2 - Step 7.2 + Step 7.4 Ready)
// Role: Transform raw engineered features into ML-friendly format
// Author: Forex ML Pipeline
// ============================================================================

const math = require("mathjs");

class FeatureTransformer {
  constructor() {}

  // -----------------------------
  // 1. Rolling Statistics
  // -----------------------------
  calculateRollingStats(values, window = 20) {
    if (!values || values.length < window) return {};

    const slice = values.slice(-window);

    return {
      rolling_mean: math.mean(slice),
      rolling_std: math.std(slice),
      rolling_skewness: this.calculateSkewness(slice),
      rolling_kurtosis: this.calculateKurtosis(slice),
    };
  }

  calculateSkewness(arr) {
    if (!arr || arr.length < 3) return 0;
    const mean = math.mean(arr);
    const std = math.std(arr);
    if (std === 0) return 0;
    const n = arr.length;
    const sumCubed = arr.reduce((acc, v) => acc + Math.pow((v - mean) / std, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sumCubed;
  }

  calculateKurtosis(arr) {
    if (!arr || arr.length < 4) return 0;
    const mean = math.mean(arr);
    const std = math.std(arr);
    if (std === 0) return 0;
    const n = arr.length;
    const sumFourth = arr.reduce((acc, v) => acc + Math.pow((v - mean) / std, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sumFourth -
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  // -----------------------------
  // 2. Normalization
  // -----------------------------
  minMaxScale(value, min, max) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    if (max === min) return 0.5; // avoid division by zero
    return (value - min) / (max - min);
  }

  zScoreNormalize(value, mean, std) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    if (std === 0) return 0;
    return (value - mean) / std;
  }

  percentileRank(value, values) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const below = sorted.filter(v => v <= value).length;
    return below / sorted.length;
  }

  // -----------------------------
  // 3. Rate of Change (Velocity/Acceleration)
  // -----------------------------
  calculateRateOfChange(values, period = 1) {
    if (!values || values.length <= period) return 0;
    const prev = values[values.length - period - 1];
    const curr = values[values.length - 1];
    if (prev === 0) return 0;
    return (curr - prev) / prev;
  }

  calculateAcceleration(values, period = 1) {
    if (!values || values.length <= period * 2) return 0;
    const roc1 = this.calculateRateOfChange(values.slice(0, -period), period);
    const roc2 = this.calculateRateOfChange(values, period);
    return roc2 - roc1;
  }

  // -----------------------------
  // 4. Master Transformation Pipeline
  // -----------------------------
  transformFeatures(rawFeaturesHistory) {
    if (!rawFeaturesHistory || rawFeaturesHistory.length < 5) {
      console.warn("⚠️ Not enough data for feature transformation");
      return {};
    }

    const transformed = {};
    const latest = rawFeaturesHistory[rawFeaturesHistory.length - 1];

    for (const key of Object.keys(latest)) {
      const series = rawFeaturesHistory.map(f => f[key]).filter(v => typeof v === "number");

      // Raw latest value
      transformed[key] = latest[key];

      // Rolling stats
      const stats = this.calculateRollingStats(series, 20);
      for (const [statKey, statVal] of Object.entries(stats)) {
        transformed[`${key}_${statKey}`] = statVal;
      }

      // Normalization
      transformed[`${key}_minmax`] = this.minMaxScale(latest[key], math.min(series), math.max(series));
      transformed[`${key}_zscore`] = this.zScoreNormalize(latest[key], math.mean(series), math.std(series));
      transformed[`${key}_percentile`] = this.percentileRank(latest[key], series);

      // Rate of Change
      transformed[`${key}_roc`] = this.calculateRateOfChange(series, 1);
      transformed[`${key}_acceleration`] = this.calculateAcceleration(series, 1);
    }

    return transformed;
  }

  // -----------------------------
  // 5. Alias for pipeline compatibility
  // -----------------------------
  applyTransformations(rawFeaturesHistory) {
    return this.transformFeatures(rawFeaturesHistory);
  }
}

module.exports = FeatureTransformer;
