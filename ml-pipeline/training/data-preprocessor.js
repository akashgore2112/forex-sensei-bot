// ============================================================================
// 📊 Data Preprocessor (Phase 2 - Step 8.1) + Integrated Feature Adapter
// Role: Convert raw MTFA + Feature Engineering output into ML-ready datasets
// Author: Forex ML Pipeline
// ============================================================================

const math = require("mathjs");

class DataPreprocessor {
  constructor(config = {}) {
    this.lookback = config.lookback || 60; // for LSTM sequences
    this.predictionHorizon = config.predictionHorizon || 5; // for labels
    this.normalizationMethod = config.normalization || "zscore"; // default for LSTM
    this.splitRatio = config.splitRatio || { train: 0.7, val: 0.15, test: 0.15 };
  }

  // ==========================================================================
  // 🛠️ Utility
  // ==========================================================================
  safe(value, fallback = 0) {
    return value !== undefined && value !== null && !isNaN(value) ? value : fallback;
  }

  minMaxScale(value, min, max) {
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  }

  zScoreScale(value, mean, std) {
    return std === 0 ? 0 : (value - mean) / std;
  }

  // ==========================================================================
  // 🔄 Feature Adapter (NEW)
  // ==========================================================================
  adaptFeatures(candles, featureGenerator, indicators) {
    /**
     * Adapter ensures that each candle has a feature vector.
     * candles: raw OHLCV
     * indicators: Phase 1 outputs
     * featureGenerator: Step 7 FeatureGenerator instance
     */
    const history = [];

    for (let i = 0; i < candles.length; i++) {
      try {
        // Slice candles/indicators progressively for realistic feature gen
        const candleSlice = candles.slice(0, i + 1);
        const indicatorSlice = {};
        for (const key of Object.keys(indicators)) {
          indicatorSlice[key] = Array.isArray(indicators[key])
            ? indicators[key].slice(0, i + 1)
            : indicators[key];
        }

        const features = featureGenerator.generateAllFeatures(candleSlice, indicatorSlice);
        history.push(features);
      } catch (err) {
        console.warn(`⚠️ Skipping feature generation at index ${i}: ${err.message}`);
        history.push({});
      }
    }

    return history;
  }

  // ==========================================================================
  // 🧮 Normalization
  // ==========================================================================
  normalize(featuresArray, method = this.normalizationMethod) {
    const normalized = [];
    const keys = Object.keys(featuresArray[0]);

    for (const key of keys) {
      const series = featuresArray.map(f => this.safe(f[key]));
      const min = math.min(series);
      const max = math.max(series);
      const mean = math.mean(series);
      const std = math.std(series);

      for (let i = 0; i < featuresArray.length; i++) {
        if (!normalized[i]) normalized[i] = {};
        const value = series[i];

        normalized[i][key] =
          method === "minmax"
            ? this.minMaxScale(value, min, max)
            : this.zScoreScale(value, mean, std);
      }
    }

    return normalized;
  }

  // ==========================================================================
  // 🏷️ Label Generation
  // ==========================================================================
  generateLabels(candles) {
    const labels = [];

    for (let i = 0; i < candles.length - this.predictionHorizon; i++) {
      const currentClose = candles[i].close;
      const futureClose = candles[i + this.predictionHorizon].close;
      const change = (futureClose - currentClose) / currentClose;

      let label = "HOLD";
      if (change > 0.01) label = "BUY";
      else if (change < -0.01) label = "SELL";

      labels.push(label);
    }

    return labels;
  }

  // ==========================================================================
  // 📐 Dataset Split
  // ==========================================================================
  splitData(features, labels) {
    const total = features.length;
    const trainEnd = Math.floor(total * this.splitRatio.train);
    const valEnd = trainEnd + Math.floor(total * this.splitRatio.val);

    return {
      train: {
        features: features.slice(0, trainEnd),
        labels: labels.slice(0, trainEnd),
      },
      val: {
        features: features.slice(trainEnd, valEnd),
        labels: labels.slice(trainEnd, valEnd),
      },
      test: {
        features: features.slice(valEnd),
        labels: labels.slice(valEnd),
      },
      metadata: {
        totalSamples: total,
        trainSamples: trainEnd,
        valSamples: valEnd - trainEnd,
        testSamples: total - valEnd,
        splitRatio: this.splitRatio,
      },
    };
  }

  // ==========================================================================
  // 🔗 LSTM Data Sequencing
  // ==========================================================================
  createSequences(features, labels) {
    const X = [];
    const Y = [];

    for (let i = this.lookback; i < features.length - this.predictionHorizon; i++) {
      const seq = features.slice(i - this.lookback, i);
      X.push(seq);

      // Encode labels (BUY/SELL/HOLD → one-hot for classification)
      const label = labels[i];
      if (label === "BUY") Y.push([1, 0, 0]);
      else if (label === "SELL") Y.push([0, 1, 0]);
      else Y.push([0, 0, 1]);
    }

    return { X, Y };
  }

  // ==========================================================================
  // 🚀 Main Preprocessing Pipeline
  // ==========================================================================
  preprocess(candles, features) {
    if (!candles || !features || candles.length !== features.length) {
      throw new Error("❌ Invalid input to DataPreprocessor: candles and features mismatch");
    }

    // Step 1: Normalize features
    const normalized = this.normalize(features, this.normalizationMethod);

    // Step 2: Generate labels
    const labels = this.generateLabels(candles);

    // Step 3: Split data
    const split = this.splitData(normalized, labels);

    // Step 4: For LSTM create sequences
    const sequences = this.createSequences(normalized, labels);

    return {
      ...split,
      sequences,
    };
  }
}

module.exports = DataPreprocessor;
