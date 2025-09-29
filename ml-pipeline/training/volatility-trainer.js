// ============================================================================
// ⚡ Volatility Trainer (Phase 2 - Step 1.3)
// Training pipeline for Volatility Predictor (XGBoost Regression)
// ============================================================================

const fs = require("fs");
const path = require("path");
const VolatilityPredictor = require("../models/volatility-predictor");

class VolatilityTrainer {
  constructor() {
    this.predictor = new VolatilityPredictor();
    this.modelPath = path.join(__dirname, "../../saved-models/volatility-model.json");
  }

  /**
   * Train volatility model on historical candles
   * @param {Array} historicalData - Array of candles with indicators
   */
  async trainVolatilityModel(historicalData) {
    if (!historicalData || historicalData.length < 500) {
      throw new Error(
        `❌ Not enough candles for training. Got ${historicalData?.length || 0}, need at least 500`
      );
    }

    console.log(`\n📊 Starting volatility model training on ${historicalData.length} candles...`);

    const metrics = await this.predictor.trainModel(historicalData);

    // 📈 Training Summary
    console.log("\n📈 TRAINING SUMMARY:");
    console.log("──────────────────────────────────────");
    console.log(`   Total Samples:   ${metrics.samples}`);
    console.log(`   Train Samples:   ${metrics.trainSize}`);
    console.log(`   Test Samples:    ${metrics.testSize}`);
    console.log(`   Mean Abs. Error: ${metrics.meanAbsoluteError.toFixed(6)}`);
    console.log("──────────────────────────────────────\n");

    await this.predictor.saveModel(this.modelPath);
    console.log(`💾 Model saved to: ${this.modelPath}`);

    return metrics;
  }

  /**
   * Load existing trained model from disk
   */
  async loadExistingModel() {
    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`❌ Saved volatility model not found at ${this.modelPath}`);
    }
    console.log(`📂 Loading saved volatility model from ${this.modelPath}...`);
    await this.predictor.loadModel(this.modelPath);
    return this.predictor;
  }

  /**
   * Get predictor instance (after training or loading)
   */
  getPredictor() {
    if (!this.predictor.trained) {
      throw new Error("❌ Volatility predictor not trained or loaded yet.");
    }
    return this.predictor;
  }
}

module.exports = VolatilityTrainer;
