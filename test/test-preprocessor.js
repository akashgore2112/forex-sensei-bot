// ============================================================================
// 🧪 Test - Data Preprocessor (Phase 2 - Step 8.1)
// Goal: Verify preprocessing pipeline with MTFA + Feature Engineering
// ============================================================================

const MTFA = require("../mtfa"); // Tumhara existing MTFA analyzer
const SwingIndicators = require("../swing-indicators");
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");

async function runPreprocessorTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STEP 8.1 - DATA PREPROCESSOR TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Fetch MTFA candles
    console.log("📊 Fetching MTFA data...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    const candles = mtfaResult.dailyCandles;
    console.log(`✅ Got ${candles.length} candles\n`);

    // Step 2: Calculate indicators
    console.log("📈 Calculating indicators...");
    const indicators = await SwingIndicators.calculateAll(candles);
    console.log("✅ Indicators ready\n");

    // Step 3: Generate full feature history (aligned!)
    console.log("⚙️ Generating feature history...");
    const featureGen = new FeatureGenerator();
    const preprocessor = new DataPreprocessor({
      lookback: 60,
      predictionHorizon: 5,
      normalization: "zscore",
    });

    // Alignment fix: return both aligned candles + features
    const { candles: alignedCandles, features } = preprocessor.adaptFeatures(
      candles,
      featureGen,
      indicators
    );

    console.log(`✅ Generated feature history for ${features.length} aligned candles\n`);

    if (features.length === 0) {
      throw new Error("❌ No features generated. Check feature generator.");
    }

    // Step 4: Preprocess into ML dataset
    console.log("🚀 Running preprocessing pipeline...");
    const dataset = preprocessor.preprocess(alignedCandles, features);

    // Step 5: Print metadata
    console.log("\n📊 Dataset Metadata:");
    console.log(dataset.metadata);

    // Step 6: Sample outputs
    console.log("\n🔍 Sample Normalized Feature Vector:");
    console.log(dataset.train.features[0]);

    console.log("\n🔍 Sample Sequence (LSTM):");
    console.log(dataset.sequences.X[0]?.slice(0, 2)); // show first 2 timesteps
    console.log("Label:", dataset.sequences.Y[0]);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Step 8.1 Preprocessor Test Completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, dataset };
  } catch (err) {
    console.error("\n❌ ERROR in Preprocessor Test:");
    console.error(`   ${err.message}`);
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

if (require.main === module) {
  runPreprocessorTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

module.exports = runPreprocessorTest;
