// ml-pipeline/models/random-forest-classifier.js
const { RandomForestClassifier } = require("ml-random-forest");
const fs = require('fs');

class SwingSignalClassifier {
  constructor() {
    this.model = null;
    this.features = [
      "ema_trend",
      "rsi_level",
      "macd_signal",
      "atr_volatility",
      "price_position",
      "momentum_strength",
      "volume_trend",
    ];
    this.labelMap = { BUY: 0, SELL: 1, HOLD: 2 };
    this.reverseLabel = ["BUY", "SELL", "HOLD"];
    this.trainingMetrics = null;
  }

  // ✅ NaN-safe conversion
  safeNumber(v) {
    if (v === null || v === undefined || isNaN(v)) return 0;
    return Number(v);
  }

  // ✅ Convert market data → features
  prepareFeatures(marketData) {
    return [
      this.safeNumber(this.calculateEMATrend(marketData)),
      this.safeNumber(this.normalizeRSI(marketData.rsi)),
      this.safeNumber(this.getMACDSignal(marketData.macd)),
      this.safeNumber(this.normalizeATR(marketData.atr)),
      this.safeNumber(this.getPricePosition(marketData)),
      this.safeNumber(this.calculateMomentum(marketData)),
      this.safeNumber(this.getVolumeTrend(marketData)),
    ];
  }

  // ✅ Balance dataset by oversampling minority classes
  balanceDataset(data, labels) {
    const classCounts = {};
    labels.forEach(l => classCounts[l] = (classCounts[l] || 0) + 1);
    
    const maxCount = Math.max(...Object.values(classCounts));
    
    const balancedData = [];
    const balancedLabels = [];
    
    [0, 1, 2].forEach(classLabel => {
      const classIndices = labels
        .map((l, i) => l === classLabel ? i : -1)
        .filter(i => i !== -1);
      
      if (classIndices.length === 0) return;
      
      const classData = classIndices.map(i => data[i]);
      const repeatTimes = Math.ceil(maxCount / classIndices.length);
      
      for (let i = 0; i < repeatTimes; i++) {
        balancedData.push(...classData);
        balancedLabels.push(...new Array(classData.length).fill(classLabel));
      }
    });
    
    console.log(`⚖️ Dataset balanced: ${balancedData.length} total samples`);
    return { balancedData, balancedLabels };
  }

  // ✅ Train model with train/test split
  async trainModel(historicalData) {
    const allData = [];
    const allLabels = [];

    console.log(`📊 Preparing training data from ${historicalData.length} candles...`);

    for (let i = 100; i < historicalData.length - 10; i++) {
      const currentData = historicalData[i];
      const features = this.prepareFeatures(currentData);

      // Feature sanity check
      if (features.length !== 7 || features.some(v => v === undefined || Number.isNaN(v))) {
        continue;
      }

      const futurePrice = historicalData[i + 5]?.close;
      const currentPrice = currentData.close;
      if (!futurePrice || !currentPrice) continue;

      const priceChange = (futurePrice - currentPrice) / currentPrice;
      let label = "HOLD";
      if (priceChange > 0.01) label = "BUY";       // +1% threshold
      else if (priceChange < -0.01) label = "SELL"; // -1% threshold

      allData.push(features);
      allLabels.push(this.labelMap[label]);
    }

    if (!allData.length || !allLabels.length) {
      throw new Error("❌ No valid training data for Random Forest.");
    }

    // ✅ Train/Test Split (80/20)
    const splitIndex = Math.floor(allData.length * 0.8);
    const trainData = allData.slice(0, splitIndex);
    const trainLabels = allLabels.slice(0, splitIndex);
    const testData = allData.slice(splitIndex);
    const testLabels = allLabels.slice(splitIndex);

    console.log(`📊 Train: ${trainData.length} samples, Test: ${testData.length} samples`);
    console.log(
      `📊 Label Distribution (train): BUY=${trainLabels.filter(l => l === 0).length}, ` +
      `SELL=${trainLabels.filter(l => l === 1).length}, HOLD=${trainLabels.filter(l => l === 2).length}`
    );

    // ✅ Balance training data
    const { balancedData, balancedLabels } = this.balanceDataset(trainData, trainLabels);

    // ✅ Train Random Forest
    this.model = new RandomForestClassifier({
      nEstimators: 100,
      maxFeatures: 0.8,
      replacement: false,
      seed: 42,
      useSampleBagging: true,
    });

    console.log("🌲 Training Random Forest (100 trees)...");
    this.model.train(balancedData, balancedLabels);
    console.log("✅ Training completed!");

    // ✅ Evaluate on test set
    this.trainingMetrics = await this.evaluateModel(testData, testLabels);
    
    console.log("\n📊 Model Performance on Test Set:");
    console.log(`   Accuracy: ${(this.trainingMetrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   Avg F1-Score: ${(this.trainingMetrics.averageF1 * 100).toFixed(2)}%`);
    console.log("   Per-Class Metrics:");
    Object.entries(this.trainingMetrics.classMetrics).forEach(([cls, metrics]) => {
      console.log(`     ${cls}: Precision=${(metrics.precision * 100).toFixed(1)}%, ` +
                  `Recall=${(metrics.recall * 100).toFixed(1)}%, F1=${(metrics.f1Score * 100).toFixed(1)}%`);
    });

    return this.trainingMetrics;
  }

  // ✅ Evaluate model performance
  async evaluateModel(testData, testLabels) {
    const predictions = testData.map(features => {
      return this.model.predict([features])[0];
    });
    
    // Calculate accuracy
    const correct = predictions.filter((p, i) => p === testLabels[i]).length;
    const accuracy = correct / testLabels.length;
    
    // Confusion matrix
    const confusionMatrix = { 
      BUY: { BUY: 0, SELL: 0, HOLD: 0 },
      SELL: { BUY: 0, SELL: 0, HOLD: 0 },
      HOLD: { BUY: 0, SELL: 0, HOLD: 0 }
    };
    
    predictions.forEach((pred, i) => {
      const actual = this.reverseLabel[testLabels[i]];
      const predicted = this.reverseLabel[pred];
      confusionMatrix[actual][predicted]++;
    });
    
    // Precision, Recall, F1 for each class
    const metrics = {};
    ['BUY', 'SELL', 'HOLD'].forEach(cls => {
      const clsIdx = this.labelMap[cls];
      const tp = confusionMatrix[cls][cls];
      
      // False positives: predicted as cls but was other class
      const fp = Object.keys(confusionMatrix)
        .filter(k => k !== cls)
        .reduce((sum, k) => sum + confusionMatrix[k][cls], 0);
      
      // False negatives: actual cls but predicted as other
      const fn = Object.keys(confusionMatrix[cls])
        .filter(k => k !== cls)
        .reduce((sum, k) => sum + confusionMatrix[cls][k], 0);
      
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1Score = precision + recall > 0 
        ? 2 * (precision * recall) / (precision + recall) 
        : 0;
      
      metrics[cls] = { precision, recall, f1Score };
    });
    
    const averageF1 = Object.values(metrics).reduce((sum, m) => sum + m.f1Score, 0) / 3;
    
    return {
      accuracy,
      confusionMatrix,
      classMetrics: metrics,
      averageF1,
      totalPredictions: testLabels.length
    };
  }

  // ✅ Calculate probabilities from tree votes
  calculateProbabilities(features) {
    if (!this.model || !this.model.estimators) {
      return { BUY: 0.33, SELL: 0.33, HOLD: 0.34 };
    }

    const votes = { 0: 0, 1: 0, 2: 0 };
    
    this.model.estimators.forEach(tree => {
      try {
        const prediction = tree.predict([features])[0];
        votes[prediction] = (votes[prediction] || 0) + 1;
      } catch (err) {
        // Skip problematic trees
      }
    });
    
    const total = this.model.estimators.length;
    return {
      BUY: votes[0] / total,
      SELL: votes[1] / total,
      HOLD: votes[2] / total
    };
  }

  // ✅ Predict BUY/SELL/HOLD with probabilities
  predict(currentData) {
    if (!this.model) throw new Error("❌ Model not trained.");
    
    const features = this.prepareFeatures(currentData);

    if (features.length !== 7) {
      throw new Error(`❌ Invalid feature length: ${features.length}, expected 7`);
    }

    const predictionIdx = this.model.predict([features])[0];
    const probabilities = this.calculateProbabilities(features);
    const signal = this.reverseLabel[predictionIdx];

    return {
      signal,
      confidence: probabilities[signal] || 0.33,
      probabilities,
      rawPrediction: predictionIdx
    };
  }

  // ✅ Save model to file
  async saveModel(filepath = './saved-models/rf-model.json') {
    if (!this.model) throw new Error("❌ No model to save");
    
    const modelData = {
      estimators: this.model.estimators,
      nEstimators: this.model.nEstimators,
      features: this.features,
      labelMap: this.labelMap,
      trainingMetrics: this.trainingMetrics,
      metadata: {
        trainedAt: new Date().toISOString(),
        version: "1.0.0"
      }
    };
    
    await fs.promises.writeFile(filepath, JSON.stringify(modelData, null, 2));
    console.log(`💾 Model saved to ${filepath}`);
  }

  // ✅ Load model from file
  async loadModel(filepath = './saved-models/rf-model.json') {
    const modelData = JSON.parse(await fs.promises.readFile(filepath, 'utf8'));
    
    this.model = new RandomForestClassifier({
      nEstimators: modelData.nEstimators || 100
    });
    
    this.model.estimators = modelData.estimators;
    this.features = modelData.features;
    this.labelMap = modelData.labelMap;
    this.trainingMetrics = modelData.trainingMetrics;
    
    console.log(`📂 Model loaded from ${filepath}`);
    console.log(`   Trained at: ${modelData.metadata.trainedAt}`);
    if (this.trainingMetrics) {
      console.log(`   Test Accuracy: ${(this.trainingMetrics.accuracy * 100).toFixed(2)}%`);
    }
  }

  // === IMPROVED INDICATOR HELPERS ===
  calculateEMATrend(data) {
    if (!data.ema20 || !data.ema50) return 0;
    return data.ema20 > data.ema50 ? 1 : -1;
  }

  normalizeRSI(rsi) {
    if (!rsi || rsi < 0 || rsi > 100) return 0.5;
    return rsi / 100;
  }

  getMACDSignal(macd) {
    if (!macd || !macd.macd || !macd.signal) return 0;
    return (macd.macd - macd.signal) / Math.abs(macd.signal || 1);
  }

  normalizeATR(atr) {
    if (!atr || atr <= 0) return 0;
    return Math.min(atr / 0.01, 1); // Normalize to 0-1 range
  }

  getPricePosition(data) {
    if (!data.ema20 || data.ema20 === 0) return 1.0;
    return data.close / data.ema20;
  }

  calculateMomentum(data) {
    if (!data.prevClose || data.prevClose === 0) return 0;
    const momentum = (data.close - data.prevClose) / data.prevClose;
    return Math.max(-0.1, Math.min(0.1, momentum)); // Clamp to ±10%
  }

  getVolumeTrend(data) {
    if (!data.volume || !data.avgVolume || data.avgVolume === 0) return 1.0;
    return Math.min(data.volume / data.avgVolume, 3); // Cap at 3x average
  }
}

module.exports = SwingSignalClassifier;
