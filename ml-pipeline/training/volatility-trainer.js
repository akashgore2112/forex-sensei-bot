// ============================================================================
// ⚡ Training pipeline for Volatility Predictor (Phase 2 - Step 1.3)
// Uses ml-xgboost booster API
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
   * 📌 Train model with historical market data
   * @param {Array} historicalData - Array of candle objects with indicators
   */
  async trainVolatilityModel(historicalData) {
    if (!historicalData || historicalData.length < 500) {
      throw new Error(
        `❌ Not enough candles. Got ${historicalData?.length || 0}, need at least 500`
      );
    }

    console.log(`\n📊 Starting volatility model training on ${historicalData.length} candles...`);

    const metrics = await this.predictor.trainModel(historicalData);

    console.log("\n📈 Training Summary:");
    console.log(`   Total Samples:   ${metrics.samples}`);
    console.log(`   Train Size:      ${metrics.trainSize}`);
    console.log(`   Test Size:       ${metrics.testSize}`);
    console.log(`   Mean Abs. Error: ${metrics.meanAbsoluteError.toFixed(6)}\n`);

    await this.predictor.saveModel(this.modelPath);
    console.log(`✅ Volatility model saved to: ${this.modelPath}`);

    return metrics;
  }

  /**
   * 📌 Load existing model from disk
   */
  async loadExistingModel() {
    console.log(`📂 Loading saved volatility model from ${this.modelPath}...`);
    await this.predictor.loadModel(this.modelPath);
    console.log("✅ Model loaded successfully!");
    return this.predictor;
  }

  /**
   * 📌 Get predictor instance (after training or loading)
   */
  getPredictor() {
    if (!this.predictor.trained) {
      throw new Error("❌ Predictor not trained or loaded yet.");
    }
    return this.predictor;
  }
}

module.exports = VolatilityTrainer;
