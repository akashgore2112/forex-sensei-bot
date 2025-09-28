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
    // ✅ Use the class properly
    const dp = new DataPreprocessor(lookback, horizon);

    // Convert dummy data into LSTM sequences
    const { features, targets } = dp.createSequences(historicalData);

    console.log("✅ Features Length:", features.length);
    console.log("✅ Targets Length:", targets.length);

    // Ek chhota sample print karo
    console.log("\n🔎 Sample Feature Window (first entry):");
    console.log(features[0]);

    console.log("\n🔎 Sample Target Window (first entry):");
    console.log(targets[0]);

    console.log("\n🎯 Data Preprocessor Test Completed Successfully!");
  } catch (err) {
    console.error("❌ Error in Data Preprocessor Test:", err);
  }
}

testPreprocessor();
