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

  // Debug flag enabled here
  const result = classifier.classifyRegime(candles, indicators, true);

  console.log("\n📌 MARKET REGIME FORECAST:");
  console.log("═══════════════════════════════");
  console.log(` Regime:      ${result.regime}`);
  console.log(` Subtype:     ${result.subtype}`);
  console.log(` Confidence:  ${result.confidence}`);
  console.log(` Strategy:    ${result.strategyRecommendation}`);
  console.log(` Risk Level:  ${result.riskLevel}`);
  console.log("────────────────────────────────");

  console.log(" Characteristics:");
  console.table(result.characteristics);

  console.log(" Metrics:");
  console.table(result.metrics);

  console.log("═══════════════════════════════\n");

  return result;
}

// ============================================================================
// 📌 Run Volatility Predictor ✅ FIXED (ATR merged into candles)
// ============================================================================
async function runVolatility(candles, indicators) {
  const predictor = new VolatilityPredictor();

  // 🔹 Attach ATR values to each candle
  const atrSeries = indicators.atr || [];
  const enrichedCandles = candles.map((c, i) => ({
    ...c,
    atr: atrSeries[i] || 0
  }));

  // 🔹 Latest candle with ATR
  const latest = enrichedCandles[enrichedCandles.length - 1];
  if (!latest.atr) {
    console.warn("⚠️ Skipping volatility forecast: ATR not available");
    return {};
  }

  const result = predictor.predict(enrichedCandles);

  console.log("\n📌 VOLATILITY FORECAST:");
  console.log("═══════════════════════════════");
  console.log(JSON.stringify(result, null, 2));
  console.log("═══════════════════════════════\n");

  return result;
}

// ============================================================================
// 📌 Main Runner
// ============================================================================
async function runAnalysis() {
  try {
    console.log("🚀 Starting Integrated Market Analysis...\n");

    const { candles, indicators } = await processCandles("EUR/USD");

    await runMarketRegime(candles, indicators);
    await runVolatility(candles, indicators);

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
