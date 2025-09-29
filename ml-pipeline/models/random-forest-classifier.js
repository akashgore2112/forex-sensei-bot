// ml-pipeline/models/random-forest-classifier.js
const RandomForest = require('random-forest-classifier').RandomForest;
const fs = require('fs');

class SwingSignalClassifier {
  constructor() {
    this.model = null;
    this.labelMap = { BUY: 0, SELL: 1, HOLD: 2 };
    this.reverseLabel = ["BUY", "SELL", "HOLD"];
    this.trainingMetrics = null;
  }

  safeNumber(v) {
    if (v === null || v === undefined || isNaN(v)) return 0;
    return Number(v);
  }

  prepareFeatures(marketData) {
    // Better feature engineering with normalization
    const emaTrend = marketData.ema20 > marketData.ema50 ? 1 : -1;
    const rsiNorm = this.safeNumber((marketData.rsi - 50) / 50); // -1 to 1
    
    const macdDiff = this.safeNumber(marketData.macd?.macd || 0) - 
                     this.safeNumber(marketData.macd?.signal || 0);
    const macdNorm = Math.tanh(macdDiff * 100);
    
    const atrNorm = this.safeNumber(marketData.atr) / (marketData.close || 1);
    const pricePos = marketData.ema20 ? (marketData.close / marketData.ema20) - 1 : 0;
    
    const momentum = marketData.prevClose && marketData.prevClose !== 0 ? 
      (marketData.close - marketData.prevClose) / marketData.prevClose : 0;
    
    const volumeRatio = marketData.avgVolume && marketData.avgVolume !== 0 ?
      (marketData.volume / marketData.avgVolume) - 1 : 0;

    return [
      this.safeNumber(emaTrend),
      this.safeNumber(rsiNorm),
      this.safeNumber(macdNorm),
      this.safeNumber(atrNorm),
      this.safeNumber(pricePos),
      this.safeNumber(momentum),
      this.safeNumber(volumeRatio)
    ];
  }

  balanceDataset(data, labels) {
    const classCounts = {};
    labels.forEach(l => classCounts[l] = (classCounts[l] || 0) + 1);
    
    console.log("Original label distribution:", classCounts);
    
    const maxCount = Math.max(...Object.values(classCounts));
    const balancedData = [];
    const balancedLabels = [];
    
    [0, 1, 2].forEach(classLabel => {
      const classIndices = labels
        .map((l, i) => l === classLabel ? i : -1)
        .filter(i => i !== -1);
      
      if (classIndices.length === 0) return;
      
      // Add all original samples
      classIndices.forEach(i => {
        balancedData.push([...data[i]]);
        balancedLabels.push(classLabel);
      });
      
      // Oversample minority class with noise
      const needed = maxCount - classIndices.length;
      for (let i = 0; i < needed; i++) {
        const randomIdx = classIndices[Math.floor(Math.random() * classIndices.length)];
        const sample = [...data[randomIdx]];
        
        // Add small noise to create variation
        const noisySample = sample.map(v => v + (Math.random() - 0.5) * 0.05);
        
        balancedData.push(noisySample);
        balancedLabels.push(classLabel);
      }
    });
    
    const balancedCounts = {};
    balancedLabels.forEach(l => balancedCounts[l] = (balancedCounts[l] || 0) + 1);
    console.log("Balanced distribution:", balancedCounts);
    
    return { balancedData, balancedLabels };
  }

  async trainModel(historicalData) {
    const allData = [];
    const allLabels = [];

    console.log(`Preparing training data from ${historicalData.length} candles...`);

    for (let i = 100; i < historicalData.length - 10; i++) {
      const currentData = historicalData[i];
      const features = this.prepareFeatures(currentData);

      if (features.length !== 7 || features.some(v => v === undefined || Number.isNaN(v))) {
        continue;
      }

      const futurePrice = historicalData[i + 5]?.close;
      const currentPrice = currentData.close;
      if (!futurePrice || !currentPrice) continue;

      const priceChange = (futurePrice - currentPrice) / currentPrice;
      
      // Looser thresholds for more balanced labels
      let label = "HOLD";
      if (priceChange > 0.005) label = "BUY";        // 0.5% threshold
      else if (priceChange < -0.005) label = "SELL"; // 0.5% threshold

      allData.push(features);
      allLabels.push(this.labelMap[label]);
    }

    if (!allData.length) {
      throw new Error("No valid training data");
    }

    // Train/test split
    const splitIndex = Math.floor(allData.length * 0.8);
    const trainData = allData.slice(0, splitIndex);
    const trainLabels = allLabels.slice(0, splitIndex);
    const testData = allData.slice(splitIndex);
    const testLabels = allLabels.slice(splitIndex);

    console.log(`Train: ${trainData.length}, Test: ${testData.length}`);

    // Balance training data
    const { balancedData, balancedLabels } = this.balanceDataset(trainData, trainLabels);

    // Train Random Forest
    this.model = new RandomForest({
      n_estimators: 100,
      max_features: 'sqrt',
      max_depth: 15,
      min_samples_split: 5,
      min_samples_leaf: 2
    });

    console.log("Training Random Forest (100 trees)...");
    this.model.fit(balancedData, balancedLabels);
    console.log("Training completed!");

    // Evaluate
    this.trainingMetrics = this.evaluateModel(testData, testLabels);
    
    console.log("\nMODEL PERFORMANCE (Test Set):");
    console.log(`Overall Accuracy: ${(this.trainingMetrics.accuracy * 100).toFixed(2)}%`);
    console.log(`Average F1-Score: ${(this.trainingMetrics.averageF1 * 100).toFixed(2)}%`);
    console.log("\nPer-Class Metrics:");
    Object.entries(this.trainingMetrics.classMetrics).forEach(([cls, m]) => {
      console.log(`  ${cls}: P=${(m.precision * 100).toFixed(1)}%, R=${(m.recall * 100).toFixed(1)}%, F1=${(m.f1Score * 100).toFixed(1)}%`);
    });

    return this.trainingMetrics;
  }

  evaluateModel(testData, testLabels) {
    const predictions = testData.map(features => this.model.predict([features])[0]);
    
    const accuracy = predictions.filter((p, i) => p === testLabels[i]).length / testLabels.length;
    
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
    
    const metrics = {};
    ['BUY', 'SELL', 'HOLD'].forEach(cls => {
      const tp = confusionMatrix[cls][cls];
      const fp = Object.keys(confusionMatrix).reduce((sum, k) => 
        k !== cls ? sum + confusionMatrix[k][cls] : sum, 0);
      const fn = Object.keys(confusionMatrix[cls]).reduce((sum, k) => 
        k !== cls ? sum + confusionMatrix[cls][k] : sum, 0);
      
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1Score = precision + recall > 0 
        ? 2 * (precision * recall) / (precision + recall) 
        : 0;
      
      metrics[cls] = { precision, recall, f1Score };
    });
    
    const averageF1 = Object.values(metrics).reduce((sum, m) => sum + m.f1Score, 0) / 3;
    
    return { accuracy, confusionMatrix, classMetrics: metrics, averageF1 };
  }

  predict(currentData) {
    if (!this.model) throw new Error("Model not trained");
    
    const features = this.prepareFeatures(currentData);
    if (features.length !== 7) throw new Error("Invalid features");

    const prediction = this.model.predict([features])[0];
    const probabilities = this.calculateProbabilities(features);

    return {
      signal: this.reverseLabel[prediction],
      confidence: probabilities[this.reverseLabel[prediction]],
      probabilities
    };
  }

  calculateProbabilities(features) {
    const votes = { BUY: 0, SELL: 0, HOLD: 0 };
    
    if (this.model && this.model.trees) {
      this.model.trees.forEach(tree => {
        try {
          const pred = tree.predict([features])[0];
          votes[this.reverseLabel[pred]]++;
        } catch (e) {}
      });
    }
    
    const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
    return {
      BUY: votes.BUY / total,
      SELL: votes.SELL / total,
      HOLD: votes.HOLD / total
    };
  }

  async saveModel(filepath = './saved-models/rf-model.json') {
    if (!this.model) throw new Error("No model to save");
    
    const modelData = {
      trees: this.model.trees,
      config: {
        n_estimators: this.model.n_estimators,
        max_depth: this.model.max_depth
      },
      trainingMetrics: this.trainingMetrics,
      metadata: { trainedAt: new Date().toISOString() }
    };
    
    await fs.promises.writeFile(filepath, JSON.stringify(modelData));
    console.log(`Model saved to ${filepath}`);
  }

  async loadModel(filepath = './saved-models/rf-model.json') {
    const modelData = JSON.parse(await fs.promises.readFile(filepath, 'utf8'));
    
    this.model = new RandomForest(modelData.config);
    this.model.trees = modelData.trees;
    this.trainingMetrics = modelData.trainingMetrics;
    
    console.log(`Model loaded from ${filepath}`);
    console.log(`Trained at: ${modelData.metadata.trainedAt}`);
    if (this.trainingMetrics) {
      console.log(`Test Accuracy: ${(this.trainingMetrics.accuracy * 100).toFixed(2)}%`);
    }
  }
}

module.exports = SwingSignalClassifier;
