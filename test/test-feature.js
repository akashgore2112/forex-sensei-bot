// ============================================================================
// 📊 Feature Engineering Test (Phase 2 - Step 7.1)
// Goal: Validate feature extraction system on real Phase 1 data
// ============================================================================

// test/test-feature.js
const MTFA = require('../mtfa');   // Tumhara existing MTFA analyzer
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');
const math = require('mathjs');

async function runTest() {
  try {
    console.log("🚀 Starting Feature Engineering Test...\n");

    // Step 1: Run MTFA to get real data
    const mtfaData = await MTFA.analyze("EUR/USD");
    if (!mtfaData || !mtfaData.dailyCandles?.length) {
      throw new Error("❌ MTFA did not return valid daily candles");
    }

    // Raw OHLCV candles
    const candles = mtfaData.dailyCandles;

    // Indicators from Phase 1
    const indicators = mtfaData.daily;

    // 🔍 Debug Print Indicators
    console.log("\n🔍 Raw Indicators from MTFA (Daily):");
    console.log(JSON.stringify(indicators, null, 2));

    // Step 2: Generate features
    const generator = new FeatureGenerator();
    const features = generator.generateAllFeatures(candles, indicators);

    // Step 3: Print results
    console.log("\n✅ Generated Features (Real Data):");
    console.log(JSON.stringify(features, null, 2));

    // Step 4: Basic validation
    console.log("\n🔍 Validation:");

    // NaN/Null/Infinity check
    const hasNaN = Object.values(features).some(
      v => v === null || v === undefined || isNaN(v) || !isFinite(v)
    );
    console.log("NaN/Null/Infinity check:", hasNaN ? "❌ FAIL" : "✅ PASS");

    // Count features
    const featureKeys = Object.keys(features);
    console.log("Total feature count:", featureKeys.length);

    // Step 5: Statistical summary using mathjs
    const numericValues = Object.values(features).filter(v => typeof v === "number");
    if (numericValues.length > 0) {
      console.log("\n📊 Feature Statistical Summary:");
      console.log("Mean:", math.mean(numericValues).toFixed(4));
      console.log("Std Dev:", math.std(numericValues).toFixed(4));
      console.log("Min:", math.min(numericValues).toFixed(4));
      console.log("Max:", math.max(numericValues).toFixed(4));
    }

    console.log("\n🎯 Feature Engineering Test Completed!");
    console.log("═════════════════════════════════════");
  } catch (err) {
    console.error("\n❌ ERROR in Feature Engineering Test ❌");
    console.error(err.message);
  }
}

runTest();
