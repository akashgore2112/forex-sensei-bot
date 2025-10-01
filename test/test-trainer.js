// test/test-trainer.js
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const ModelTrainer = require("../ml-pipeline/training/model-trainer");

async function runTrainerTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STEP 8.2 - MODEL TRAINER TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Get data
    console.log("📊 Fetching data...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    const candles = mtfaResult.dailyCandles;
    console.log(`✅ Got ${candles.length} candles\n`);

    // Step 2: Calculate indicators
    console.log("📈 Calculating indicators...");
    const indicators = await SwingIndicators.calculateAll(candles);
    console.log("✅ Indicators ready\n");

    // Step 3: Preprocess data
    console.log("⚙️ Preprocessing data...");
    const featureGen = new FeatureGenerator();
    const preprocessor = new DataPreprocessor();
    const dataset = preprocessor.preprocess(candles, indicators, featureGen);
    console.log("✅ Data preprocessed\n");

    // Step 4: Train models
    console.log("🤖 Starting model training...\n");
    const trainer = new ModelTrainer({ version: "test_v2" });
    const results = await trainer.trainAll(dataset);

    // Display results
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   TRAINING RESULTS SUMMARY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("🌲 Random Forest:");
    console.log(`   ✅ Success: ${results.randomForest.success}`);
    console.log(`   📊 Training Accuracy: ${(results.randomForest.trainingMetrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   📊 Test Accuracy: ${(results.randomForest.testMetrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   📊 Test Macro F1: ${(results.randomForest.testMetrics.macroF1 * 100).toFixed(2)}%`);
    console.log(`   💾 Path: ${results.randomForest.path}`);

    console.log("\n🔮 LSTM:");
    console.log(`   ✅ Success: ${results.lstm.success}`);
    console.log(`   📊 Training Loss: ${results.lstm.trainingMetrics.finalLoss?.toFixed(6) || "N/A"}`);
    console.log(`   📊 Val Loss: ${results.lstm.trainingMetrics.finalValLoss?.toFixed(6) || "N/A"}`);
    console.log(`   📊 Test MAE: ${results.lstm.testMetrics.mae?.toFixed(6) || "N/A"}`);
    console.log(`   📊 Test RMSE: ${results.lstm.testMetrics.rmse?.toFixed(6) || "N/A"}`);
    console.log(`   💾 Path: ${results.lstm.path}`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All models trained and evaluated successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, results };

  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

if (require.main === module) {
  runTrainerTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = runTrainerTest;
