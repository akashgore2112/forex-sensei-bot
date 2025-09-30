// ml-pipeline/training/data-preprocessor.js
// ============================================================================
// 📊 Data Preprocessor (Phase 2 - Step 8.1) - FIXED
// Role: Convert Phase 1 + Feature Engineering into ML-ready datasets
// ============================================================================

const math = require("mathjs");

class DataPreprocessor {
  constructor(config = {}) {
    this.lookback = config.lookback || 60;
    this.predictionHorizon = config.predictionHorizon || 5;
    this.normalizationMethod = config.normalization || "zscore";
    this.splitRatio = config.splitRatio || { train: 0.7, val: 0.15, test: 0.15 };
  }

  // ==========================================================================
  // Feature Generation - Generate features once for all candles
  // ==========================================================================
  generateFeatures(candles, indicators, featureGenerator) {
    console.log("⚙️ Generating features from raw data...");
    
    // Generate features once for the full dataset
    const features = featureGenerator.generateAllFeatures(candles, indicators);
    
    // Convert single feature object into array matching candle length
    // (Each candle gets the same latest features - simplified approach)
    const featureArray = [];
    const featureKeys = Object.keys(features);
    
    for (let i = 100; i < candles.length; i++) {
      // Only start from index 100 (minimum for feature generation)
      const featureObj = {};
      featureKeys.forEach(key => {
        featureObj[key] = features[key];
      });
      featureArray.push(featureObj);
    }
    
    // Align candles to match feature array
    const alignedCandles = candles.slice(100);
    
    console.log(`✅ Generated features for ${featureArray.length} candles\n`);
    
    return { candles: alignedCandles, features: featureArray };
  }

  // ==========================================================================
  // Normalization
  // ==========================================================================
  normalize(featuresArray, method = this.normalizationMethod) {
    if (!featuresArray || featuresArray.length === 0) return [];

    const normalized = [];
    const keys = Object.keys(featuresArray[0]);

    // Calculate stats for each feature
    const stats = {};
    for (const key of keys) {
      const series = featuresArray.map(f => f[key] || 0).filter(v => Number.isFinite(v));
      stats[key] = {
        min: math.min(series),
        max: math.max(series),
        mean: math.mean(series),
        std: math.std(series) || 1
      };
    }

    // Normalize each sample
    for (let i = 0; i < featuresArray.length; i++) {
      const normalizedSample = {};
      
      for (const key of keys) {
        const value = featuresArray[i][key] || 0;
        const { min, max, mean, std } = stats[key];
        
        if (method === "minmax") {
          normalizedSample[key] = max > min ? (value - min) / (max - min) : 0.5;
        } else {
          normalizedSample[key] = (value - mean) / std;
        }
      }
      
      normalized.push(normalizedSample);
    }

    return normalized;
  }

  // ==========================================================================
  // Label Generation
  // ==========================================================================
  generateLabels(candles) {
    const labels = [];

    for (let i = 0; i < candles.length - this.predictionHorizon; i++) {
      const currentClose = candles[i].close;
      const futureClose = candles[i + this.predictionHorizon].close;
      const change = (futureClose - currentClose) / currentClose;

      let label = "HOLD";
      if (change > 0.01) label = "BUY";        // +1% or more
      else if (change < -0.01) label = "SELL"; // -1% or less

      labels.push(label);
    }

    return labels;
  }

  // ==========================================================================
  // Dataset Split
  // ==========================================================================
  splitData(features, labels) {
    const total = Math.min(features.length, labels.length);
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
        features: features.slice(valEnd, total),
        labels: labels.slice(valEnd, total),
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
  // LSTM Sequence Creation
  // ==========================================================================
  createSequences(features, candles) {
    const sequences = [];
    const targets = [];

    for (let i = this.lookback; i < features.length - this.predictionHorizon; i++) {
      // Sequence: last N feature vectors
      const sequence = features.slice(i - this.lookback, i);
      sequences.push(sequence);

      // Target: next 5 close prices (for LSTM price prediction)
      const futurePrices = [];
      for (let j = 1; j <= this.predictionHorizon; j++) {
        futurePrices.push(candles[i + j].close);
      }
      targets.push(futurePrices);
    }

    return { X: sequences, Y: targets };
  }

  // ==========================================================================
  // Random Forest Dataset (features as arrays)
  // ==========================================================================
  prepareForRandomForest(features, labels) {
    // Convert feature objects to arrays for Random Forest
    const X = features.map(f => Object.values(f));
    const y = labels.map(label => {
      if (label === "BUY") return 0;
      if (label === "SELL") return 1;
      return 2; // HOLD
    });

    return { X, y };
  }

  // ==========================================================================
  // Main Preprocessing Pipeline
  // ==========================================================================
  preprocess(candles, indicators, featureGenerator) {
    console.log("\n🚀 Starting data preprocessing pipeline...\n");

    // Step 1: Generate features
    const { candles: alignedCandles, features } = this.generateFeatures(
      candles,
      indicators,
      featureGenerator
    );

    console.log(`📊 Aligned data: ${alignedCandles.length} candles, ${features.length} feature vectors`);

    // Step 2: Normalize features
    console.log("⚙️ Normalizing features...");
    const normalized = this.normalize(features, this.normalizationMethod);

    // Step 3: Generate labels
    console.log("🏷️ Generating labels...");
    const labels = this.generateLabels(alignedCandles);

    // Step 4: Split data
    console.log("📐 Splitting dataset...");
    const split = this.splitData(normalized, labels);

    // Step 5: Create LSTM sequences
    console.log("🔗 Creating LSTM sequences...");
    const lstmData = this.createSequences(normalized, alignedCandles);

    // Step 6: Prepare Random Forest data
    console.log("🌲 Preparing Random Forest data...");
    const rfData = this.prepareForRandomForest(
      split.train.features,
      split.train.labels
    );

    console.log("\n✅ Preprocessing complete!\n");

    return {
      ...split,
      lstm: lstmData,
      randomForest: rfData,
      rawCandles: alignedCandles,
      rawFeatures: features
    };
  }
}

module.exports = DataPreprocessor;
