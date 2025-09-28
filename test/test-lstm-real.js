// test/test-lstm-real.js
// 📊 Step 1.1 - Real LSTM Test with Expected Output Format

const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");

async function runRealLSTMTest() {
  console.log("🚀 Starting Step 1.1: LSTM Training with Real Historical Data...");

  const predictor = new LSTMPricePredictor();
  await predictor.buildModel();

  const preprocessor = new DataPreprocessor(60, 5); // 60-day lookback, 5-day horizon

  // 1. Fetch real historical data
  console.log("📊 Fetching historical candles (EUR/USD)...");
  const candles = await SwingDataFetcher.getDailyData("EUR/USD");
  console.log(`✅ Got ${candles.length} candles`);

  // 2. Add indicators
  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // 3. Merge candles + indicators
  const processed = candles.map((c, i) => ({
    close: c.close,
    ema20: Array.isArray(indicators.ema20) ? indicators.ema20[i] : indicators.ema20,
    rsi: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
    macd: indicators.macd && Array.isArray(indicators.macd.MACD)
      ? indicators.macd.MACD[i]
      : indicators.macd?.MACD || 0,
    atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr
  }));

  console.log(`✅ Processed ${processed.length} candles with indicators`);
  console.log("🔎 Sample processed[0..2]:", processed.slice(0, 3));

  // 4. Convert into training sequences (tensors already returned)
  const { features, targets } = preprocessor.createSequences(processed);
  console.log("📊 Features tensor shape:", features.shape);
  console.log("🎯 Targets tensor shape:", targets.shape);

  // 5. Train model
  console.log("⚡ Training LSTM on real forex data...");
  await predictor.model.fit(features, targets, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: [
      {
        onEpochEnd: (epoch, logs) => {
          console.log(`📉 Epoch ${epoch + 1}: loss=${logs.loss.toFixed(6)}, val_loss=${logs.val_loss?.toFixed(6)}`);
        }
      }
    ],
  });
  console.log("✅ Training Completed!");

  // 6. Save model
  await predictor.model.save("file://./saved-models/lstm-model");
  console.log("💾 Model Saved to ./saved-models/lstm-model");

  // 7. Predict next 5 days
  console.log("\n🔮 Making 5-day prediction...");
  const recentData = processed.slice(-60); // last 60 days
  const prediction = await predictor.predict(recentData);

  // ✅ Ensure output format matches Step 1.1 expected
  const formattedResult = {
    predictedPrices: prediction.predictedPrices.map(p => Number(p.toFixed(5))),
    confidence: prediction.confidence ?? 0.0,
    direction: prediction.direction,
    volatility: prediction.volatility ?? "UNKNOWN"
  };

  console.log("\n📌 Final Prediction Result:");
  console.dir(formattedResult, { depth: null });
}

runRealLSTMTest().catch((err) => {
  console.error("❌ Error in LSTM real test:", err);
});
