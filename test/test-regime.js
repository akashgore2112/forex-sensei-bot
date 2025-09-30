// ============================================================================
// 📊 Market Regime Classifier Test (Production-Ready)
// Phase 2 - Step 1.4
// Focused solely on regime classification
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const MarketRegimeClassifier = require("../ml-pipeline/models/market-regime-classifier");

// ============================================================================
// 📌 Main Test Runner
// ============================================================================
async function runRegimeTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   MARKET REGIME CLASSIFIER TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Fetch market data
    console.log("📊 Fetching MTFA data for EUR/USD...");
    const mtfaResult = await MTFA.analyze("EUR/USD");

    if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
      throw new Error("❌ MTFA did not return daily candles");
    }

    const candles = mtfaResult.dailyCandles;
    console.log(`✅ Got ${candles.length} daily candles\n`);

    // Step 2: Calculate indicators
    console.log("📈 Calculating indicators...");
    const indicators = await SwingIndicators.calculateAll(candles);
    console.log("✅ Indicators calculated successfully\n");

    // Step 3: Classify market regime
    console.log("⚡ Classifying market regime...\n");
    
    const classifier = new MarketRegimeClassifier();
    const result = classifier.classifyRegime(candles, indicators);

    // Step 4: Display results
    displayResults(result);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Market Regime Test Completed Successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, result };

  } catch (err) {
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR:");
    console.error(`   ${err.message}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// 📌 Display Results
// ============================================================================
function displayResults(result) {
  console.log("═══════════════════════════════════════════");
  console.log("        MARKET REGIME CLASSIFICATION");
  console.log("═══════════════════════════════════════════\n");

  console.log("📊 REGIME IDENTIFICATION:");
  console.log("───────────────────────────────────────────");
  console.log(`   Regime:      ${result.regime}`);
  console.log(`   Subtype:     ${result.subtype}`);
  console.log(`   Confidence:  ${(result.confidence * 100).toFixed(1)}%`);
  console.log();

  console.log("🎯 TRADING RECOMMENDATIONS:");
  console.log("───────────────────────────────────────────");
  console.log(`   Strategy:    ${result.strategyRecommendation}`);
  console.log(`   Risk Level:  ${result.riskLevel}`);
  console.log();

  console.log("📈 MARKET CHARACTERISTICS:");
  console.log("───────────────────────────────────────────");
  Object.entries(result.characteristics).forEach(([key, value]) => {
    const label = formatLabel(key);
    console.log(`   ${label}: ${value}`);
  });
  console.log();

  console.log("🔍 TECHNICAL METRICS:");
  console.log("───────────────────────────────────────────");
  Object.entries(result.metrics).forEach(([key, value]) => {
    const label = formatLabel(key);
    const formattedValue = typeof value === 'number' 
      ? value.toFixed(2) 
      : value;
    console.log(`   ${label}: ${formattedValue}`);
  });
  console.log();

  console.log("═══════════════════════════════════════════\n");

  // Interpretation guide
  displayInterpretation(result);
}

// ============================================================================
// 📌 Display Interpretation
// ============================================================================
function displayInterpretation(result) {
  console.log("💡 INTERPRETATION:");
  console.log("───────────────────────────────────────────");

  switch (result.regime) {
    case "TRENDING":
      console.log("   The market is showing clear directional movement.");
      console.log(`   ${result.subtype.includes('UP') ? 'Bullish' : 'Bearish'} momentum is strong.`);
      console.log("   ✓ Trend-following strategies recommended");
      console.log("   ✓ Look for pullback entries in trend direction");
      break;

    case "RANGING":
      console.log("   The market is consolidating in a range.");
      console.log("   Price is oscillating between support/resistance.");
      console.log("   ✓ Mean-reversion strategies recommended");
      console.log("   ✓ Buy support, sell resistance");
      break;

    case "BREAKOUT":
      console.log("   The market is breaking out of consolidation.");
      console.log(`   ${result.subtype.includes('BULLISH') ? 'Upward' : 'Downward'} breakout in progress.`);
      console.log("   ✓ Momentum plays recommended");
      console.log("   ⚠️ Wait for volume confirmation");
      break;

    case "VOLATILE":
      console.log("   The market is experiencing high volatility.");
      console.log("   Price movements are erratic and unpredictable.");
      console.log("   ⚠️ Reduce position sizes");
      console.log("   ⚠️ Widen stop losses or avoid trading");
      break;

    case "TRANSITIONAL":
      console.log("   The market is in transition between regimes.");
      console.log("   Direction is unclear - wait for clarity.");
      console.log("   ⏸️ Stay on sidelines");
      console.log("   ⏸️ Watch for regime confirmation");
      break;
  }

  console.log("───────────────────────────────────────────\n");

  // Risk warning based on confidence
  if (result.confidence < 0.6) {
    console.log("⚠️ WARNING: Low confidence classification");
    console.log("   Consider waiting for clearer market conditions\n");
  }
}

// ============================================================================
// 📌 Utility Functions
// ============================================================================
function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .padEnd(20);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
if (require.main === module) {
  runRegimeTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

module.exports = runRegimeTest;
