// ============================================================================
// ⚡ Training pipeline for Volatility Predictor (Phase 2 - Step 1.3)
// ============================================================================

const VolatilityPredictor = require("../models/volatility-predictor");

/**
 * Train the volatility model using historical data
 * @param {VolatilityPredictor} predictor - Instance of VolatilityPredictor
 * @param {Array} historicalData - Array of candle objects with indicators
 * @returns {Object} Training metrics
 */
async function trainVolatilityModel(predictor, historicalData) {
  if (!predictor) {
    throw new Error("❌ Predictor instance not provided to trainer");
  }

  if (!historicalData || historicalData.length < 500) {
    throw new Error(`❌ Not enough candles. Got ${historicalData?.length || 0}, need at least 500`);
  }

  console.log(`\n📊 Starting volatility model training on ${historicalData.length} candles...`);

  const metrics = await predictor.trainModel(historicalData);

  // Training Summary
  console.log("\n📈 Training Summary:");
  console.log("──────────────────────────────────────");
  console.log(`   Total Samples:   ${metrics.samples}`);
  console.log(`   Train Size:      ${metrics.trainSize}`);
  console.log(`   Test Size:       ${metrics.testSize}`);
  console.log(`   Mean Abs Error:  ${metrics.meanAbsoluteError.toFixed(6)}`);
  console.log("──────────────────────────────────────\n");

  return metrics;
}

module.exports = trainVolatilityModel;
