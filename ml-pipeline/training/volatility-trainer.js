// ============================================================================
// ⚡ Volatility Predictor Wrapper (Statistical Model - No Training)
// Phase 2 - Step 1.3
// ============================================================================

const VolatilityPredictor = require("../models/volatility-predictor");

class VolatilityTrainer {
  constructor() {
    this.predictor = new VolatilityPredictor();
  }

  /**
   * Statistical model doesn't need training
   * This method exists for API compatibility
   */
  async trainVolatilityModel(historicalData) {
    console.log("\n📊 Statistical Volatility Model");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ No training required!");
    console.log("📈 Model calculates volatility in real-time from data");
    console.log(`📊 Data available: ${historicalData.length} candles\n`);

    return {
      message: "Statistical model ready - no training needed",
      dataPoints: historicalData.length,
      ready: true
    };
  }

  /**
   * Get predictor instance (always ready)
   */
  getPredictor() {
    return this.predictor;
  }

  /**
   * No model file to load (for compatibility)
   */
  async loadExistingModel() {
    console.log("✅ Statistical model ready (no loading needed)");
    return this.predictor;
  }
}

module.exports = VolatilityTrainer;
