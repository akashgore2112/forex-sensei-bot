// ============================================================================
// 📊 Integrated Market Analysis Test (Phase 2 - Step 1.4)
// Includes: Market Regime Classification + Volatility Forecast
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const MarketRegimeClassifier = require("../ml-pipeline/models/market-regime-classifier");
const VolatilityPredictor = require("../ml-pipeline/models/volatility-predictor");

// ============================================================================
// 📌 Helper: Process candles + indicators
// ============================================================================
async function processCandles(pair = "EUR/USD") {
  console.log(`📊 Running Multi-Timeframe Analysis for ${pair}...`);
  const mtfaResult = await MTFA.analyze(pair);

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log("─────────────────────────────────────────────");
  console.log(`📊 MTFA returned total candles: ${candles.length}`);

  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  console.log("✅ Indicators calculated successfully");
  console.log("─────────────────────────────────────────────\n");

  return { candles, indicators };
}

// ============================================================================
// 📌 Run Market Regime Classifier
// ============================================================================
async function runMarketRegime(candles, indicators) {
  const classifier = new MarketRegimeClassifier();

  // 🔹 Debug flag enabled here
  const result = classifier.classifyRegime(candles, indicators, true);

  console.log("\n📌 MARKET REGIME FORECAST:");
  console.log("──────────────────────────────");
  console.log(JSON.stringify(result, null, 2));

  // Extra debug info
  console.log("──────────────────────────────");
  console.log(`📊 Usable candles for regime detection: ${candles.length}`);
  console.log("──────────────────────────────");

  return result;
}

// ============================================================================
// 📌 Run Volatility Predictor
// ============================================================================
async function runVolatility(candles) {
  const predictor = new VolatilityPredictor();
  const latest = candles[candles.length - 1] || {};

  // Safe fallback
  if (!latest || !latest.atr) {
    console.warn("⚠️ Skipping volatility forecast: latest candle missing ATR");
    return {};
  }

  const result = predictor.predict(candles, latest);

  console.log("\n📌 VOLATILITY FORECAST:");
  console.log("──────────────────────────────");
  console.log(JSON.stringify(result, null, 2));
  console.log("──────────────────────────────");

  return result;
}

// ============================================================================
// 📌 Main Runner
// ============================================================================
async function runAnalysis() {
  try {
    console.log("🚀 Starting Integrated Market Analysis...\n");

    const { candles, indicators } = await processCandles("EUR/USD");

    // Run Regime Classification (with debug)
    await runMarketRegime(candles, indicators);

    // Run Volatility Prediction
    await runVolatility(candles);

    console.log("\n🎯 Integrated Market Analysis Completed!");
    console.log("═════════════════════════════════════════");
  } catch (err) {
    console.error("\n❌ FATAL ERROR ❌");
    console.error(err.message);
    process.exit(1);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
runAnalysis();
