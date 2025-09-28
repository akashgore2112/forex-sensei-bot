// test/test-data-preprocessor.js
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");

async function testPreprocessor() {
  console.log("🔍 Testing Data Preprocessor...");

  // Dummy historical data (close, ema20, rsi, macd, atr)
  const historicalData = [];
  for (let i = 0; i < 100; i++) {
    historicalData.push({
      close: 1.10 + i * 0.001,
      ema20: 1.09 + i * 0.001,
      rsi: 50 + (i % 10),
      macd: 0.001 * (i % 5),
      atr: 0.005 + (i % 3) * 0.001
    });
  }

  const lookback = 60;
  const horizon = 5;

  try {
    const { features, targets } = DataPreprocessor.prepareTrainingData(
      historicalData,
      lookback,
      horizon
    );

    console.log("✅ Features Shape:", features.shape);
    console.log("✅ Targets Shape:", targets.shape);

    // Ek chhota sample print karo
    console.log("\n🔎 Sample Feature Window (first entry):");
    console.log(await features.slice([0, 0, 0], [1, lookback, 5]).array());

    console.log("\n🔎 Sample Target Window (first entry):");
    console.log(await targets.slice([0, 0], [1, horizon]).array());

    console.log("\n🎯 Data Preprocessor Test Completed Successfully!");
  } catch (err) {
    console.error("❌ Error in Data Preprocessor Test:", err);
  }
}

testPreprocessor();
