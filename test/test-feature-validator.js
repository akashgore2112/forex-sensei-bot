// ============================================================================
// 🧪 Feature Validator Test (Phase 2 - Step 7.4)
// ============================================================================

const MTFA = require("../mtfa");
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");
const FeatureTransformer = require("../ml-pipeline/feature-engineering/feature-transformer");
const CrossFeatures = require("../ml-pipeline/feature-engineering/cross-features");
const FeatureValidator = require("../ml-pipeline/feature-engineering/feature-validator");

async function runTest() {
  console.log("🚀 Starting Feature Validation Test...\n");

  const mtfaData = await MTFA.analyze("EUR/USD");
  const candles = mtfaData.dailyCandles;
  const indicators = mtfaData.daily;

  // Step 1: Generate raw features
  const generator = new FeatureGenerator();
  const rawFeatures = generator.generateAllFeatures(candles, indicators);

  // Step 2: Apply transformations
  const transformer = new FeatureTransformer();
  // NOTE: history-based transform, pass array of snapshots
  const transformedFeatures = transformer.transformFeatures([rawFeatures]);

  // Step 3: Add cross features
  const cross = new CrossFeatures();
  const crossFeatures = cross.generateAllCrossFeatures(transformedFeatures, candles);

  // Merge all features
  const allFeatures = { ...rawFeatures, ...transformedFeatures, ...crossFeatures };

  // Step 4: Validate
  const validator = new FeatureValidator();
  const report = validator.validate(allFeatures);

  console.log("\n✅ Validation Report:");
  console.log(JSON.stringify(report, null, 2));

  console.log("\n🎯 Feature Validator Test Completed!");
  console.log("═════════════════════════════════════");
}

runTest();
