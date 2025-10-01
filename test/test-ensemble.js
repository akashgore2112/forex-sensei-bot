// test/test-ensemble.js
// ============================================================================
// 🧪 Step 9.4 - Ensemble Predictor Test (Dynamic Version)
// Runs full pipeline: MTFA → Indicators → Models → Ensemble → Formatter
// ============================================================================

const fs = require("fs");
const path = require("path");

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");

// Ensemble pipeline
const EnsemblePredictor = require("../ml-pipeline/prediction/ensemble-predictor");
const PredictionFormatter = require("../ml-pipeline/prediction/prediction-formatter");

async function runEnsembleTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STEP 9.4 - ENSEMBLE PREDICTOR TEST");
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

    // Step 3: Initialize Ensemble + Formatter
    const ensemble = new EnsemblePredictor();
    const formatter = new PredictionFormatter();

    // Dynamically detect latest model path (symlink "current" or latest vN folder)
    let modelPath = path.join(__dirname, "../saved-models/current");
    if (!fs.existsSync(modelPath)) {
      const savedModelsPath = path.join(__dirname, "../saved-models");
      const versions = fs
        .readdirSync(savedModelsPath)
        .filter((f) => f.startsWith("v"))
        .sort();
      if (versions.length === 0) {
        throw new Error("❌ No trained models found in saved-models/");
      }
      modelPath = path.join(savedModelsPath, versions[versions.length - 1]);
    }

    console.log(`📂 Loading trained models from: ${modelPath}`);
    await ensemble.loadModels(modelPath);
    console.log("✅ Models loaded\n");

    // Step 4: Run ensemble prediction
    console.log("🔮 Running ensemble prediction...");
    const ensembleResult = await ensemble.predict(candles, indicators);

    // Step 5: Format final output
    console.log("📝 Formatting prediction output...");
    const formattedOutput = formatter.format({
      pair: "EUR/USD",
      ensemble: ensembleResult,
      models: ensembleResult.models,
      tradingParams: ensembleResult.tradingParams,
    });

    // Step 6: Display Results
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("        ENSEMBLE PREDICTION RESULT");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(JSON.stringify(formattedOutput, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Ensemble Test Completed Successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, output: formattedOutput };
  } catch (err) {
    console.error("\n❌ ERROR during Ensemble Test:");
    console.error(err.message);
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

// Run directly if executed as script
if (require.main === module) {
  runEnsembleTest()
    .then((result) => process.exit(result.success ? 0 : 1))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

module.exports = runEnsembleTest;
