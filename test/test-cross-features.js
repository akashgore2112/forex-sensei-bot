// ============================================================================
// 🧪 Feature Engineering Test (Phase 2 - Step 7.3)
// Goal: Validate cross-features (Confluence, Divergence, Patterns)
// ============================================================================

const MTFA = require('../mtfa');   // Tumhara Phase 1 MTFA analyzer
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');
const CrossFeatures = require('../ml-pipeline/feature-engineering/cross-features');
const math = require('mathjs');

async function runCrossFeatureTest() {
  try {
    console.log("🚀 Starting Cross-Features Test (Step 7.3)...\n");

    // Step 1: Get Phase 1 data from MTFA
    const mtfaData = await MTFA.analyze("EUR/USD");
    if (!mtfaData || !mtfaData.dailyCandles?.length) {
      throw new Error("❌ MTFA did not return valid daily candles");
    }

    // Raw OHLCV candles
    const candles = mtfaData.dailyCandles;

    // Indicators from Phase 1
    const indicators = mtfaData.daily;

    // Step 2: Generate base features (Step 7.1)
    const generator = new FeatureGenerator();
    const baseFeatures = generator.generateAllFeatures(candles, indicators);

    // Step 3: Generate cross features (Step 7.3)
    const cross = new CrossFeatures();
    const crossFeatures = cross.generateAllCrossFeatures(baseFeatures, candles);

    // Step 4: Combine
    const allFeatures = { ...baseFeatures, ...crossFeatures };

    // Step 5: Print results
    console.log("\n✅ Cross-Features Generated (Real Data):");
    console.log(JSON.stringify(crossFeatures, null, 2));

    console.log("\n📊 Total Features (Base + Cross):", Object.keys(allFeatures).length);

    // Step 6: Validation
    const hasNaN = Object.values(allFeatures).some(
      v => v === null || v === undefined || isNaN(v) || !isFinite(v)
    );
    console.log("🔍 NaN/Null/Infinity check:", hasNaN ? "❌ FAIL" : "✅ PASS");

    // Step 7: Summary stats
    const numericValues = Object.values(allFeatures).filter(v => typeof v === "number");
    if (numericValues.length > 0) {
      console.log("\n📈 Statistical Summary (All Features):");
      console.log("Mean:", math.mean(numericValues).toFixed(4));
      console.log("Std Dev:", math.std(numericValues).toFixed(4));
      console.log("Min:", math.min(numericValues).toFixed(4));
      console.log("Max:", math.max(numericValues).toFixed(4));
    }

    console.log("\n🎯 Cross-Features Test Completed!");
    console.log("═════════════════════════════════════════════");

  } catch (err) {
    console.error("\n❌ ERROR in Cross-Features Test ❌");
    console.error(err.message);
  }
}

runCrossFeatureTest();
