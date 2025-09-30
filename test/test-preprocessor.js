// ============================================================================
// 🧪 Test Script for Data Preprocessor (Step 8.1)
// Goal: Verify preprocessing pipeline on MTFA candles + features
// ============================================================================

const MTFA = require("../mtfa"); // Tumhara Phase 1 analyzer
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");

async function runPreprocessorTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   TESTING DATA PREPROCESSOR (Step 8.1)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Get historical data (Phase 1)
    console.log("📊 Fetching historical candles...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    const candles = mtfaResult.dailyCandles;

    console.log(`✅ Got ${candles.length} daily candles\n`);

    // Step 2: Generate features from indicators
    console.log("⚙️ Generating features...");
    const fg = new FeatureGenerator();
    const features = fg.generateAllFeatures(candles, mtfaResult.daily);

    // Convert features into array of snapshots (per candle)
    const featuresArray = candles.map((c, idx) => {
      return {
        close: c.close,
        ema20: mtfaResult.daily.ema20[idx] || 0,
        rsi: mtfaResult.daily.rsi14[idx] || 0,
        atr: mtfaResult.daily.atr[idx] || 0,
        macd: mtfaResult.daily.macd?.macd[idx] || 0,
      };
    });

    console.log(`✅ Generated ${featuresArray.length} feature snapshots\n`);

    // Step 3: Run Data Preprocessor
    console.log("🛠️ Running preprocessing pipeline...");
    const preprocessor = new DataPreprocessor({
      lookback: 60,
      predictionHorizon: 5,
      normalization: "zscore",
    });

    const dataset = preprocessor.preprocess(candles, featuresArray);

    // Step 4: Display Results
    console.log("\n════════════════════════════════════════");
    console.log("         DATA PREPROCESSOR RESULT");
    console.log("════════════════════════════════════════\n");

    console.log("📊 Metadata:", dataset.metadata);
    console.log("\n🔹 Example Feature Vector:", dataset.train.features[0]);
    console.log("\n🔹 Example Label:", dataset.train.labels[0]);
    console.log("\n🔹 Example Sequence (LSTM):", dataset.sequences.X[0][0]);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Data Preprocessor Test Completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return dataset;
  } catch (err) {
    console.error("❌ ERROR in Preprocessor Test:", err.message);
    console.error(err.stack);
  }
}

if (require.main === module) {
  runPreprocessorTest();
}

module.exports = runPreprocessorTest;
