// Create: test/retrain-models.js (NEW FILE)
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const ModelTrainer = require("../ml-pipeline/training/model-trainer");

async function retrainModels() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   RETRAINING ML MODELS (5 YEARS DATA)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Fetch 5 YEARS of data instead of 2
    console.log("📥 Fetching 5 years of historical data...");
    const dailyData = await SwingDataFetcher.getDailyData("EUR/USD");
    
    // Filter to last 5 years manually
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    const filtered = dailyData.filter(candle => {
      const candleDate = new Date(candle.timestamp);
      return candleDate >= fiveYearsAgo;
    });

    console.log(`✅ Got ${filtered.length} candles (${(filtered.length / 252).toFixed(1)} years)\n`);

    if (filtered.length < 1000) {
      throw new Error("Need at least 1000 candles for quality training");
    }

    // Calculate indicators
    console.log("📈 Calculating indicators...");
    const indicators = await SwingIndicators.calculateAll(filtered);
    console.log("✅ Indicators calculated\n");

    // Feature engineering
    const featureGenerator = new FeatureGenerator();
    
    // Data preprocessing
    const preprocessor = new DataPreprocessor({
      lookback: 60,
      predictionHorizon: 5,
      normalization: "zscore",
      splitRatio: { train: 0.80, val: 0.10, test: 0.10 } // 80/10/10 split
    });

    const dataset = preprocessor.preprocess(filtered, indicators, featureGenerator);

    // Train models
    const trainer = new ModelTrainer({
      version: `retrained_${Date.now()}`,
      saveModels: true
    });

    const results = await trainer.trainAll(dataset);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ RETRAINING COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, results };

  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    return { success: false, error: err.message };
  }
}

if (require.main === module) {
  retrainModels()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = retrainModels;
