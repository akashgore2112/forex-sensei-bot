// ============================================================================
// 📊 Market Regime Classifier Test (Phase 2 - Step 1.4)
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const MarketRegimeClassifier = require("../ml-pipeline/models/market-regime-classifier");

async function runRegimeTest() {
  console.log("🚀 Starting Market Regime Classification Test...");

  // STEP 1: Fetch candles from MTFA
  const mtfaResult = await MTFA.analyze("EUR/USD");
  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  // STEP 2: Calculate indicators
  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // STEP 3: Classify market regime
  const classifier = new MarketRegimeClassifier();
  const regime = classifier.classifyRegime(candles, indicators);

  // STEP 4: Print results
  console.log("\n📌 MARKET REGIME FORECAST:");
  console.log("──────────────────────────────────────");
  console.log(`   Regime:              ${regime.regime}`);
  console.log(`   Subtype:             ${regime.subtype}`);
  console.log(`   Confidence:          ${(regime.confidence * 100).toFixed(1)}%`);
  console.log(`   Strategy:            ${regime.strategyRecommendation}`);
  console.log(`   Risk Level:          ${regime.riskLevel}`);

  console.log("\n🔍 Key Metrics:");
  console.log(`   ADX:                 ${regime.metrics.adx.toFixed(2)}`);
  console.log(`   ATR:                 ${regime.metrics.atr.toFixed(6)}`);
  console.log(`   BB Width:            ${regime.metrics.bbWidth.toFixed(6)}`);
  console.log(`   EMA Alignment:       ${regime.characteristics.emaAlignment}`);
  console.log(`   Volume:              ${regime.metrics.volume}`);
  console.log(`   Avg Volume:          ${regime.metrics.avgVolume.toFixed(2)}`);
  console.log("──────────────────────────────────────");

  console.log("\n🎯 Market Regime Classification Completed!");
  console.log("═════════════════════════════════════════");
}

// MAIN EXECUTION
runRegimeTest().catch((err) => {
  console.error("\n❌❌❌ FATAL ERROR ❌❌❌");
  console.error(err.message);
  process.exit(1);
});
