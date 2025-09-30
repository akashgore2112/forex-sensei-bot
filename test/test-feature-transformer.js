// ============================================================================
// 📊 Feature Transformation Test (Phase 2 - Step 7.2)
// Goal: Validate rolling stats, normalization, and rate of change transformations
// ============================================================================

const MTFA = require("../mtfa"); // Tumhara Phase 1 MTFA
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");
const FeatureTransformer = require("../ml-pipeline/feature-engineering/feature-transformer");
const math = require("mathjs");

async function runTest() {
  try {
    console.log("🚀 Starting Feature Transformation Test...\n");

    // Step 1: Run MTFA to get real data
    const mtfaData = await MTFA.analyze("EUR/USD");
    if (!mtfaData || !mtfaData.dailyCandles?.length) {
      throw new Error("❌ MTFA did not return valid daily candles");
    }

    const candles = mtfaData.dailyCandles;
    const indicators = mtfaData.daily;

    // Step 2: Generate raw features for last N candles (history required for rolling stats)
    const generator = new FeatureGenerator();
    const featureHistory = [];

    // Generate features for last 60 candles (so we have rolling window)
    const windowSize = 60;
    for (let i = candles.length - windowSize; i < candles.length; i++) {
      const sliceCandles = candles.slice(0, i + 1);
      const features = generator.generateAllFeatures(sliceCandles, indicators);
      featureHistory.push(features);
    }

    console.log(`✅ Raw Feature History Generated (count: ${featureHistory.length})`);

    // Step 3: Transform features
    const transformer = new FeatureTransformer();
    const transformed = transformer.transformFeatures(featureHistory);

    // Step 4: Print transformed features
    console.log("\n✨ Transformed Features (Latest Candle):");
    console.log(JSON.stringify(transformed, null, 2));

    // Step 5: Validation
    console.log("\n🔍 Validation:");
    const hasNaN = Object.values(transformed).some(
      v => v === null || v === undefined || isNaN(v) || !isFinite(v)
    );
    console.log("NaN/Null/Infinity check:", hasNaN ? "❌ FAIL" : "✅ PASS");

    console.log("Total transformed feature count:", Object.keys(transformed).length);

    // Step 6: Statistical summary
    const numericValues = Object.values(transformed).filter(v => typeof v === "number");
    if (numericValues.length > 0) {
      console.log("\n📊 Transformed Feature Statistical Summary:");
      console.log("Mean:", math.mean(numericValues).toFixed(4));
      console.log("Std Dev:", math.std(numericValues).toFixed(4));
      console.log("Min:", math.min(numericValues).toFixed(4));
      console.log("Max:", math.max(numericValues).toFixed(4));
    }

    console.log("\n🎯 Feature Transformation Test Completed!");
    console.log("═════════════════════════════════════");
  } catch (err) {
    console.error("\n❌ ERROR in Feature Transformation Test ❌");
    console.error(err.message);
  }
}

runTest();
