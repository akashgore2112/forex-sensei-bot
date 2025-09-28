// test/test-lstm-real.js
const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");
const tf = require("@tensorflow/tfjs-node");

async function runRealLSTMTest() {
  console.log("🚀 Starting LSTM Training with Real Historical Data...");

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

  // 3. Merge into processed data
  const processed = candles.map((candle, idx) => ({
    close: candle.close,
    ema20: indicators.ema20[idx] || indicators.ema20[indicators.ema20.length - 1],
    rsi: indicators.rsi14[idx] || indicators.rsi14[indicators.rsi14.length - 1],
    macd: indicators.macd.MACD[idx] || indicators.macd.MACD[indicators.macd.MACD.length - 1],
    atr: indicators.atr[idx] || indicators.atr[indicators.atr.length - 1],
  }));

  console.log(`✅ Processed ${processed.length} candles with indicators`);

  // 4. Convert into training sequences
  const { features, targets } = preprocessor.prepareTrainingData(processed);

  console.log("📊 Features shape:", features.shape);
  console.log("🎯 Targets shape:", targets.shape);

  // 5. Train model
  console.log("⚡ Training LSTM on real forex data...");
  await predictor.model.fit(features, targets, {
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
  const recentData = processed.slice(-60); // last 60 days for input
  const prediction = await predictor.predict(recentData);

  console.log("\n📌 Prediction Result:");
  console.dir(prediction, { depth: null });
}

runRealLSTMTest().catch((err) => {
  console.error("❌ Error in LSTM real test:", err);
});
