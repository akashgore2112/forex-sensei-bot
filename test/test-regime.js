// ============================================================================
// 📊 Market Regime Classifier Test (Phase 2 - Step 1.4)
// Uses MTFA + SwingIndicators + MarketRegimeClassifier
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const MarketRegimeClassifier = require("../ml-pipeline/models/market-regime-classifier");

async function runRegimeTest() {
  console.log("🚀 Starting Market Regime Classification Test...");

  const mtfaResult = await MTFA.analyze("EUR/USD");
  const candles = mtfaResult.dailyCandles;
  const indicators = await SwingIndicators.calculateAll(candles);

  const classifier = new MarketRegimeClassifier();
  const result = classifier.classifyRegime(candles, indicators);

  console.log("\n📌 MARKET REGIME RESULT:");
  console.log(JSON.stringify(result, null, 2));
}

runRegimeTest().catch((err) => {
  console.error("❌ Fatal error in regime test:", err.message);
  console.error(err.stack);
  process.exit(1);
});
