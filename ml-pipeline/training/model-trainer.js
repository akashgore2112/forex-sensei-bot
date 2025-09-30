// ============================================================================
// 🤖 Model Trainer (Phase 2 - Step 8.2)
// Role: Centralized orchestrator for training + saving all ML models
// Author: Forex ML Pipeline
// ============================================================================

const fs = require("fs");
const path = require("path");

// Import Models
// Correct paths
const LSTMPricePredictor = require("../models/lstm-predictor");
const SwingSignalClassifier = require("../models/random-forest-classifier");
const VolatilityPredictor = require("../models/volatility-predictor");
const MarketRegimeClassifier = require("../models/market-regime-classifier");

class ModelTrainer {
  constructor(config = {}) {
    this.basePath = config.basePath || path.join(__dirname, "../../saved-models");
    this.version = config.version || `v${Date.now()}`;
    this.saveModels = config.saveModels ?? true;

    // Ensure directory exists
    if (!fs.existsSync(this.basePath)) fs.mkdirSync(this.basePath, { recursive: true });
  }

  // ==========================================================================
  // 🔄 Unified Training Interface
  // ==========================================================================
  async trainAll(dataset, options = {}) {
    console.log(`\n🚀 Training ALL models [version=${this.version}]...\n`);

    const results = {};

    results.randomForest = await this.trainRandomForest(dataset, options);
    results.lstm = await this.trainLSTM(dataset, options);
    results.volatility = await this.trainVolatility(dataset, options);
    results.regime = await this.trainRegimeClassifier(dataset, options);

    console.log("\n✅ All models trained successfully!");
    return results;
  }

  // ==========================================================================
  // 🌲 Random Forest Classifier
  // ==========================================================================
  async trainRandomForest(dataset, options = {}) {
    console.log("🌲 Training Random Forest Classifier...");

    const rf = new SwingSignalClassifier(options.rf || { nEstimators: 100 });
    await rf.trainModel(dataset.train.features, dataset.train.labels);

    const modelData = rf.saveModel ? rf.saveModel() : { message: "No saveModel implemented" };
    return this._saveModel("random-forest", modelData, options);
  }

  // ==========================================================================
  // 🔮 LSTM Price Predictor
  // ==========================================================================
  async trainLSTM(dataset, options = {}) {
    console.log("🔮 Training LSTM Price Predictor...");

    const lstm = new LSTMPricePredictor(options.lstm || { epochs: 50, batchSize: 32 });
    await lstm.trainModel(dataset.sequences.X, dataset.sequences.Y);

    const modelData = lstm.saveModel ? await lstm.saveModel() : { message: "No saveModel implemented" };
    return this._saveModel("lstm", modelData, options);
  }

  // ==========================================================================
  // 📉 Volatility Predictor
  // ==========================================================================
  async trainVolatility(dataset, options = {}) {
    console.log("📉 Training Volatility Predictor...");

    const vol = new VolatilityPredictor(options.vol || {});
    await vol.trainModel(dataset.train.features, dataset.train.labels);

    const modelData = vol.saveModel ? vol.saveModel() : { message: "No saveModel implemented" };
    return this._saveModel("volatility", modelData, options);
  }

  // ==========================================================================
  // 📊 Market Regime Classifier
  // ==========================================================================
  async trainRegimeClassifier(dataset, options = {}) {
    console.log("📊 Training Market Regime Classifier...");

    const regime = new MarketRegimeClassifier(options.regime || {});
    await regime.trainModel(dataset.train.features, dataset.train.labels);

    const modelData = regime.saveModel ? regime.saveModel() : { message: "No saveModel implemented" };
    return this._saveModel("regime", modelData, options);
  }

  // ==========================================================================
  // 💾 Save Model with Versioning
  // ==========================================================================
  _saveModel(name, modelData, options = {}) {
    if (!this.saveModels) {
      console.log(`⚠️ Skipping save for ${name} (saveModels=false)`);
      return { saved: false, model: modelData };
    }

    const versionPath = path.join(this.basePath, this.version);
    if (!fs.existsSync(versionPath)) fs.mkdirSync(versionPath, { recursive: true });

    const filePath = path.join(versionPath, `${name}-model.json`);
    fs.writeFileSync(filePath, JSON.stringify(modelData, null, 2));

    // Update "current" symlink
    const currentPath = path.join(this.basePath, "current");
    try {
      if (fs.existsSync(currentPath)) fs.rmSync(currentPath, { recursive: true, force: true });
      fs.symlinkSync(versionPath, currentPath, "dir");
    } catch (err) {
      console.warn(`⚠️ Could not update symlink: ${err.message}`);
    }

    console.log(`💾 Saved ${name} model → ${filePath}`);
    return { saved: true, path: filePath, model: modelData };
  }
}

module.exports = ModelTrainer;
