// test/test-features.js
// ============================================================================
// 📊 Feature Engineering Test (Phase 2 - Step 7)
// Goal: Test complete feature generation pipeline
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");
const CrossFeatures = require("../ml-pipeline/feature-engineering/cross-features");
const FeatureTransformer = require("../ml-pipeline/feature-engineering/feature-transformer");
const FeatureValidator = require("../ml-pipeline/feature-engineering/feature-validator");

async function runFeatureTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   FEATURE ENGINEERING SYSTEM TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Fetch Phase 1 data
    console.log("📊 Fetching MTFA data...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    const candles = mtfaResult.dailyCandles;
    console.log(`✅ Got ${candles.length} candles\n`);

    // Step 2: Calculate Phase 1 indicators
    console.log("📈 Calculating indicators...");
    const indicators = await SwingIndicators.calculateAll(candles);
    console.log("✅ Indicators calculated\n");

    // Step 3: Generate base features
    console.log("⚙️ Generating base features...");
    const featureGenerator = new FeatureGenerator();
    const baseFeatures = featureGenerator.generateAllFeatures(candles, indicators);
    console.log(`✅ Generated ${Object.keys(baseFeatures).length} base features\n`);

    // Step 4: Generate cross features
    console.log("🤝 Generating cross features...");
    const crossFeatures = new CrossFeatures();
    const crossFeaturesResult = crossFeatures.generateAllCrossFeatures(baseFeatures, candles);
    console.log(`✅ Generated ${Object.keys(crossFeaturesResult).length} cross features\n`);

    // Step 5: Combine all features
    const allFeatures = { ...baseFeatures, ...crossFeaturesResult };
    console.log(`📊 Total features: ${Object.keys(allFeatures).length}\n`);

    // Step 6: Validate features
    console.log("🛡️ Validating features...");
    const validator = new FeatureValidator();
    const validation = validator.validate(allFeatures);
    
    console.log(`   Status: ${validation.status}`);
    console.log(`   Missing values: ${validation.missing.length}`);
    console.log(`   Outliers detected: ${validation.outliers.length}`);
    
    if (validation.missing.length > 0) {
      console.log(`   ⚠️ Missing: ${validation.missing.join(", ")}`);
    }
    if (validation.outliers.length > 0) {
      console.log(`   ⚠️ Outliers: ${validation.outliers.map(o => o.feature).join(", ")}`);
    }
    console.log();

    // Step 7: Display sample features
    displayFeatures(allFeatures);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Feature Engineering Test Completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, features: allFeatures };

  } catch (err) {
    console.error("\n❌ ERROR:");
    console.error(`   ${err.message}`);
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

function displayFeatures(features) {
  console.log("═══════════════════════════════════════════");
  console.log("        GENERATED FEATURES SAMPLE");
  console.log("═══════════════════════════════════════════\n");

  const categories = {
    "Trend Features": ["ema_trend_strength", "price_above_ema20", "ema_alignment_score"],
    "Momentum Features": ["rsi_normalized", "macd_above_signal", "momentum_score"],
    "Volatility Features": ["atr_normalized", "bb_squeeze", "volatility_regime"],
    "Volume Features": ["volume_ratio", "volume_trend", "volume_spike"],
    "Cross Features": ["trend_momentum_confluence", "rsi_macd_agreement", "breakout_detected"]
  };

  for (const [category, featureNames] of Object.entries(categories)) {
    console.log(`📊 ${category}:`);
    console.log("───────────────────────────────────────────");
    featureNames.forEach(name => {
      const value = features[name];
      const formatted = typeof value === 'number' ? value.toFixed(4) : value;
      console.log(`   ${name.padEnd(30)} ${formatted}`);
    });
    console.log();
  }

  console.log("═══════════════════════════════════════════\n");
}

if (require.main === module) {
  runFeatureTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

module.exports = runFeatureTest;
