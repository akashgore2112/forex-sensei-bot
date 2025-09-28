// test/test-lstm-real.js
// 📊 Step 1.1 - Real LSTM Test with Expected Output Format

const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");
const tf = require("@tensorflow/tfjs-node");

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

  // 4. Convert into training sequences
  const { features, targets } = preprocessor.createSequences(processed);
  console.log("📊 Features length:", features.length);
  console.log("🎯 Targets length:", targets.length);

  // Convert to tensors
  const featureTensor = tf.tensor3d(features);
  const targetTensor = tf.tensor2d(targets);

  // 5. Train model
  console.log("⚡ Training LSTM on real forex data...");
  await predictor.model.fit(featureTensor, targetTensor, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: tf.callbacks.earlyStopping({ patience: 5 }),
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
    predictedPrices: prediction.predictedPrices,
    confidence: prediction.confidence,
    direction: prediction.direction,
    volatility: prediction.volatility
  };

  console.log("\n📌 Final Prediction Result:");
  console.dir(formattedResult, { depth: null });
}

runRealLSTMTest().catch((err) => {
  console.error("❌ Error in LSTM real test:", err);
});
