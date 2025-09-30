// ============================================================================
// 🛡️ Feature Validator (Phase 2 - Step 7.4)
// Goal: Ensure features are clean, valid, and ML-ready
// ============================================================================

const math = require("mathjs");

class FeatureValidator {
  constructor(thresholds = {}) {
    this.zScoreThreshold = thresholds.zScoreThreshold || 3; // outlier detection
    this.correlationThreshold = thresholds.correlationThreshold || 0.9; // correlation
  }

  // Check for NaN, null, Infinity
  checkMissing(features) {
    const invalidKeys = [];
    for (const [key, value] of Object.entries(features)) {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        invalidKeys.push(key);
      }
    }
    return invalidKeys;
  }

  // Outlier detection using Z-score
  detectOutliers(features) {
    const values = Object.values(features).filter(v => typeof v === "number");
    const mean = math.mean(values);
    const std = math.std(values) || 1e-9;

    const outliers = [];
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === "number") {
        const z = (value - mean) / std;
        if (Math.abs(z) > this.zScoreThreshold) {
          outliers.push({ feature: key, value, zScore: z.toFixed(2) });
        }
      }
    }
    return outliers;
  }

  // Correlation analysis (Pearson)
  detectCorrelations(featureMatrix) {
    const keys = Object.keys(featureMatrix[0]);
    const correlatedPairs = [];

    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const arr1 = featureMatrix.map(f => f[keys[i]]);
        const arr2 = featureMatrix.map(f => f[keys[j]]);

        const corr = this.pearsonCorrelation(arr1, arr2);
        if (Math.abs(corr) >= this.correlationThreshold) {
          correlatedPairs.push({
            feature1: keys[i],
            feature2: keys[j],
            correlation: corr.toFixed(2)
          });
        }
      }
    }
    return correlatedPairs;
  }

  // Pearson correlation helper
  pearsonCorrelation(x, y) {
    const n = x.length;
    const meanX = math.mean(x);
    const meanY = math.mean(y);

    const num = x.map((xi, idx) => (xi - meanX) * (y[idx] - meanY)).reduce((a, b) => a + b, 0);
    const den = Math.sqrt(
      x.map(xi => Math.pow(xi - meanX, 2)).reduce((a, b) => a + b, 0) *
      y.map(yi => Math.pow(yi - meanY, 2)).reduce((a, b) => a + b, 0)
    );

    return den === 0 ? 0 : num / den;
  }

  // Run all validations
  validate(features, featureMatrix = []) {
    const report = {};

    // Missing check
    report.missing = this.checkMissing(features);

    // Outlier detection
    report.outliers = this.detectOutliers(features);

    // Correlation (only if multiple samples provided)
    if (featureMatrix.length > 1) {
      report.correlated = this.detectCorrelations(featureMatrix);
    } else {
      report.correlated = [];
    }

    // Status
    report.status = (report.missing.length === 0 && report.outliers.length === 0) ? "PASS" : "WARN";

    return report;
  }
}

module.exports = FeatureValidator;
