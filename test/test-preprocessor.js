// test/test-preprocessor.js
// ============================================================================
// 🧪 Test - Data Preprocessor (Phase 2 - Step 8.1) - FIXED
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");

async function runPreprocessorTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STEP 8.1 - DATA PREPROCESSOR TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Fetch MTFA data
    console.log("📊 Fetching MTFA data...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    const candles = mtfaResult.dailyCandles;
    console.log(`✅ Got ${candles.length} candles\n`);

    // Step 2: Calculate indicators
    console.log("📈 Calculating indicators...");
    const indicators = await SwingIndicators.calculateAll(candles);
    console.log("✅ Indicators calculated\n");

    // Step 3: Initialize preprocessor and feature generator
    const featureGen = new FeatureGenerator();
    const preprocessor = new DataPreprocessor({
      lookback: 60,
      predictionHorizon: 5,
      normalization: "zscore",
    });

    // Step 4: Run preprocessing pipeline
    const dataset = preprocessor.preprocess(candles, indicators, featureGen);

    // Step 5: Display results
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("          PREPROCESSING RESULTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Dataset Metadata:");
    console.log(`   Total Samples: ${dataset.metadata.totalSamples}`);
    console.log(`   Train: ${dataset.metadata.trainSamples}`);
    console.log(`   Validation: ${dataset.metadata.valSamples}`);
    console.log(`   Test: ${dataset.metadata.testSamples}`);

    console.log("\n📊 LSTM Data:");
    console.log(`   Sequences: ${dataset.lstm.X.length}`);
    console.log(`   Targets: ${dataset.lstm.Y.length}`);

    console.log("\n📊 Random Forest Data:");
    console.log(`   Training samples: ${dataset.randomForest.X.length}`);
    console.log(`   Feature dimensions: ${dataset.randomForest.X[0]?.length || 0}`);

    console.log("\n🔍 Sample Normalized Feature:");
    console.log(dataset.train.features[0]);

    console.log("\n🔍 Sample Label:");
    console.log(dataset.train.labels[0]);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Preprocessor Test Completed Successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, dataset };
  } catch (err) {
    console.error("\n❌ ERROR:");
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
