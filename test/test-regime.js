// ============================================================================
// 📊 Integrated Market Analysis Test (Phase 2 - Step 1.4 Final)
// Combines Volatility Predictor + Market Regime Classifier
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const VolatilityPredictor = require("../ml-pipeline/models/volatility-predictor");
const MarketRegimeClassifier = require("../ml-pipeline/models/market-regime-classifier");

async function runMarketAnalysis(pair = "EUR/USD") {
  console.log("🚀 Starting Integrated Market Analysis...");
  console.log(`Pair: ${pair}\n`);

  // STEP 1: Fetch data
  const mtfaResult = await MTFA.analyze(pair);
  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return valid candles");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Loaded ${candles.length} candles from MTFA\n`);

  // STEP 2: Calculate indicators
  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // STEP 3: Run Volatility Predictor
  const volatility = VolatilityPredictor.predictVolatility(candles, indicators);

  // STEP 4: Run Market Regime Classifier
  const regimeClassifier = new MarketRegimeClassifier();
  const regime = regimeClassifier.classifyRegime(candles, indicators);

  // STEP 5: Combined Output
  const result = {
    pair,
    volatilityForecast: volatility,
    regimeForecast: regime,
    meta: {
      timestamp: new Date().toISOString(),
      samples: candles.length,
    },
  };

  console.log("\n📌 FINAL MARKET ANALYSIS RESULT:");
  console.log("──────────────────────────────────────");
  console.log(JSON.stringify(result, null, 2));
  console.log("──────────────────────────────────────\n");

  return result;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
runMarketAnalysis().catch((err) => {
  console.error("\n❌❌❌ FATAL ERROR ❌❌❌");
  console.error(err.message);
  process.exit(1);
});
