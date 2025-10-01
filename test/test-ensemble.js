// test/test-ensemble.js
const fs = require("fs");
const path = require("path");

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const EnsemblePredictor = require("../ml-pipeline/prediction/ensemble-predictor");
const PredictionFormatter = require("../ml-pipeline/prediction/prediction-formatter");

async function runEnsembleTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STEP 9 - ENSEMBLE PREDICTOR TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    console.log("📊 Fetching MTFA data...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    const candles = mtfaResult.dailyCandles;
    console.log(`✅ Got ${candles.length} candles\n`);

    console.log("📈 Calculating indicators...");
    const indicators = await SwingIndicators.calculateAll(candles);
    console.log("✅ Indicators calculated\n");

    const ensemble = new EnsemblePredictor();
    const formatter = new PredictionFormatter();

    // Find latest model version
    const savedModelsPath = path.join(__dirname, "../saved-models");
    const versions = fs.readdirSync(savedModelsPath)
      .filter(f => f.startsWith("v") || f.startsWith("test_"))
      .sort();
    
    if (versions.length === 0) {
      throw new Error("No trained models found. Run test-trainer.js first.");
    }

    const modelPath = path.join(savedModelsPath, versions[versions.length - 1]);
    console.log(`📂 Using models from: ${modelPath}\n`);

    await ensemble.loadModels(modelPath);

    console.log("🔮 Running ensemble prediction...");
    const ensembleResult = await ensemble.predict(candles, indicators);
    console.log("✅ Prediction complete\n");

    console.log("📝 Formatting output...");
    const formattedOutput = formatter.format({
      pair: "EUR/USD",
      ensemble: ensembleResult
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("      ENSEMBLE PREDICTION RESULT");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(JSON.stringify(formattedOutput, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Ensemble Test Completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, output: formattedOutput };
  } catch (err) {
    console.error("\n❌ ERROR:");
    console.error(err.message);
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

if (require.main === module) {
  runEnsembleTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = runEnsembleTest;
