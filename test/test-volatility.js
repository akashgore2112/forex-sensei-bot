// ============================================================================
// 📊 Volatility Predictor Test (Statistical Model - No Training)
// Phase 2 - Step 1.3
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const VolatilityPredictor = require("../ml-pipeline/models/volatility-predictor");

// ============================================================================
// 📌 Helper: Merge candles + indicators
// ============================================================================
async function processCandles(pair = "EUR/USD") {
  console.log(`\n📊 Fetching MTFA data for ${pair}...`);
  const mtfaResult = await MTFA.analyze(pair);

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  console.log("📈 Calculating indicators on candles...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // Merge candles + indicators
  const processed = candles.map((c, i) => ({
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume || 0,
    rsi: indicators.rsi14?.[i] || 50,
    atr: indicators.atr?.[i] || 0,
    adx: indicators.adx?.[i] || 20
  }));

  // Filter invalid samples (ensure ATR exists)
  const validProcessed = processed.filter(d => 
    d.close > 0 && d.high > 0 && d.low > 0 && d.atr > 0
  );

  console.log(`✅ Valid samples: ${validProcessed.length}/${processed.length}\n`);

  return validProcessed;
}

// ============================================================================
// 📌 Main test runner
// ============================================================================
async function runVolatilityTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STATISTICAL VOLATILITY PREDICTOR TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Process candle data
    const processedData = await processCandles("EUR/USD");

    if (processedData.length < 60) {
      throw new Error(`Need at least 60 candles, got ${processedData.length}`);
    }

    // Step 2: Create predictor (no training needed!)
    console.log("⚡ Initializing Statistical Volatility Predictor...");
    const predictor = new VolatilityPredictor();
    console.log("✅ Predictor ready (no training required)\n");

    // Step 3: Generate prediction
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("        VOLATILITY FORECAST RESULTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const prediction = predictor.predict(processedData);

    // Display results
    console.log("📊 MAIN FORECAST:");
    console.log("─────────────────────────────────────────");
    console.log(`   Current Volatility:   ${prediction.currentVolatility}`);
    console.log(`   Predicted Volatility: ${prediction.predictedVolatility}`);
    console.log(`   Change:               ${prediction.percentChange > 0 ? '+' : ''}${prediction.percentChange}%`);
    console.log(`   Volatility Level:     ${prediction.volatilityLevel}`);
    console.log(`   Confidence:           ${(prediction.confidence * 100).toFixed(1)}%`);
    console.log(`   Risk Adjustment:      ${prediction.riskAdjustment}x`);
    console.log(`   Recommendation:       ${prediction.recommendation}`);
    
    console.log("\n📈 DETAILED ANALYSIS:");
    console.log("─────────────────────────────────────────");
    console.log(`   Trend:                ${prediction.details.trend}`);
    console.log(`   Momentum:             ${prediction.details.momentum > 0 ? '+' : ''}${prediction.details.momentum}%`);
    console.log(`   Market Regime:        ${prediction.details.regime}`);
    console.log(`   ATR Percentile:       ${prediction.details.atrPercentile}%`);
    console.log(`   Historical Vol:       ${(prediction.details.historicalVol * 100).toFixed(2)}%`);
    console.log(`   EWMA Vol:             ${(prediction.details.ewmaVol * 100).toFixed(2)}%`);
    
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Volatility Test Completed Successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return {
      success: true,
      prediction
    };

  } catch (err) {
    console.error("\n❌ ERROR:");
    console.error(`   ${err.message}`);
    console.error("\n" + err.stack);
    return {
      success: false,
      error: err.message
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
if (require.main === module) {
  runVolatilityTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

module.exports = runVolatilityTest;
