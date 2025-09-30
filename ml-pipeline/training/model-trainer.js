// ml-pipeline/training/model-trainer.js
// ============================================================================
// 🤖 Model Trainer (Phase 2 - Step 8.2) - FIXED
// Role: Train only ML models (RF, LSTM). Statistical models don't train.
// ============================================================================

const fs = require("fs");
const path = require("path");

// Import ML Models (only these need training)
const LSTMPricePredictor = require("../models/lstm-predictor");
const SwingSignalClassifier = require("../models/random-forest-classifier");

class ModelTrainer {
  constructor(config = {}) {
    this.basePath = config.basePath || path.join(__dirname, "../../saved-models");
    this.version = config.version || `v${Date.now()}`;
    this.saveModels = config.saveModels ?? true;

    // Ensure base path exists
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  // ==========================================================================
  // Train All ML Models (Not Statistical Models)
  // ==========================================================================
  async trainAll(dataset, options = {}) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   TRAINING ALL ML MODELS [${this.version}]`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const results = {};

    // Only train ML models (not statistical models)
    results.randomForest = await this.trainRandomForest(dataset, options);
    results.lstm = await this.trainLSTM(dataset, options);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All ML models trained successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Save training summary
    this._saveTrainingSummary(results);

    return results;
  }

  // ==========================================================================
  // Random Forest Classifier
  // ==========================================================================
  async trainRandomForest(dataset, options = {}) {
    console.log("🌲 Training Random Forest Classifier...");

    if (!dataset.randomForest || !dataset.randomForest.X || dataset.randomForest.X.length === 0) {
      throw new Error("❌ No Random Forest training data available");
    }

    const rf = new SwingSignalClassifier();
    
    // Prepare data in format RF expects (candles with indicators)
    const trainingData = [];
    for (let i = 0; i < dataset.randomForest.X.length; i++) {
      const features = dataset.randomForest.X[i];
      
      // Convert back to candle-like object
      trainingData.push({
        close: dataset.rawCandles[i]?.close || 0,
        ema20: features[0] || 0,
        ema50: features[1] || 0,
        rsi: features[2] || 0,
        macd: { macd: features[3] || 0 },
        atr: features[4] || 0,
        prevClose: i > 0 ? dataset.rawCandles[i - 1]?.close || 0 : 0,
        volume: dataset.rawCandles[i]?.volume || 0,
        avgVolume: dataset.rawCandles[i]?.volume || 1
      });
    }

    const metrics = await rf.trainModel(trainingData);

    // ✅ Ensure save directory exists
    const saveDir = path.join(this.basePath, this.version);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // Save model
    const savePath = path.join(saveDir, "rf-model.json");
    await rf.saveModel(savePath);

    console.log(`   ✅ Random Forest trained`);
    console.log(`   📊 Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   💾 Saved to: ${savePath}\n`);

    return { success: true, path: savePath, metrics };
  }

  // ==========================================================================
  // LSTM Price Predictor
  // ==========================================================================
  async trainLSTM(dataset, options = {}) {
    console.log("🔮 Training LSTM Price Predictor...");

    if (!dataset.lstm || !dataset.lstm.X || dataset.lstm.X.length === 0) {
      throw new Error("❌ No LSTM sequence data available");
    }

    const lstm = new LSTMPricePredictor();
    
    // Build model first
    await lstm.buildModel();

    // Prepare data in format LSTM expects
    const trainingData = dataset.rawCandles.slice(0, dataset.lstm.X.length + 60);
    
    const metrics = await lstm.trainModel(trainingData);

    // ✅ Ensure save directory exists
    const saveDir = path.join(this.basePath, this.version);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // Save model
    const savePath = path.join(saveDir, "lstm-model");
    await lstm.model.save(`file://${savePath}`);

    console.log(`   ✅ LSTM trained`);
    console.log(`   📊 Final loss: ${metrics?.history?.loss?.slice(-1)[0]?.toFixed(6) || "N/A"}`);
    console.log(`   💾 Saved to: ${savePath}\n`);

    return { success: true, path: savePath, metrics };
  }

  // ==========================================================================
  // Save Training Summary
  // ==========================================================================
  _saveTrainingSummary(results) {
    // ✅ Ensure save directory exists
    const saveDir = path.join(this.basePath, this.version);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const summary = {
      version: this.version,
      trainedAt: new Date().toISOString(),
      models: results
    };

    const summaryPath = path.join(saveDir, "training-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`📋 Training summary saved to: ${summaryPath}`);
  }
}

module.exports = ModelTrainer;
