// test/test-lstm-accuracy.js
// 📊 Step 1.8 - Accuracy Evaluation of LSTM Model

const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");
const tf = require("@tensorflow/tfjs-node");

async function testLSTMAccuracy() {
  console.log("🚀 Starting Step 1.8: Accuracy Evaluation...");

  const predictor = new LSTMPricePredictor();
  await predictor.buildModel();

  const preprocessor = new DataPreprocessor(60, 5); // 60-day lookback, 5-day horizon

  // 1. Fetch historical data
  console.log("📊 Fetching EUR/USD candles...");
  const candles = await SwingDataFetcher.getDailyData("EUR/USD");
  console.log(`✅ Got ${candles.length} candles`);

  // 2. Add indicators
  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // 3. Process data into features
  const processed = candles.map((c, i) => ({
    close: c.close,
    ema20: Array.isArray(indicators.ema20) ? indicators.ema20[i] : indicators.ema20,
    rsi: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
    macd: Array.isArray(indicators.macd.MACD) ? indicators.macd.MACD[i] : indicators.macd.MACD,
    atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr,
  }));

  console.log(`✅ Processed ${processed.length} candles with indicators`);

  // 4. Create training sequences
  const { features, targets } = preprocessor.createSequences(processed);
  
  // Split 80/20
  const splitIndex = Math.floor(features.shape[0] * 0.8);

  const trainX = features.slice([0, 0, 0], [splitIndex, 60, 5]);
  const trainY = targets.slice([0, 0], [splitIndex, 5]);

  const testX = features.slice([splitIndex, 0, 0], [features.shape[0] - splitIndex, 60, 5]);
  const testY = targets.slice([splitIndex, 0], [targets.shape[0] - splitIndex, 5]);

  console.log(`📊 Train size: ${trainX.shape[0]} | Test size: ${testX.shape[0]}`);

  // 5. Train model
  console.log("⚡ Training LSTM...");
  await predictor.model.fit(trainX, trainY, {
    epochs: 20,
    batchSize: 32,
    validationSplit: 0.1,
    callbacks: tf.callbacks.earlyStopping({ patience: 3 }),
  });

  console.log("✅ Training Complete!");

  // 6. Evaluate accuracy
  console.log("📊 Evaluating on test data...");
  const predictions = predictor.model.predict(testX);
  const predValues = await predictions.array();
  const trueValues = await testY.array();

  // Calculate Metrics
  let mse = 0, mae = 0, correctDir = 0;

  for (let i = 0; i < predValues.length; i++) {
    const predLast = predValues[i][predValues[i].length - 1]; // predicted last day
    const trueLast = trueValues[i][trueValues[i].length - 1]; // actual last day

    mse += Math.pow(predLast - trueLast, 2);
    mae += Math.abs(predLast - trueLast);

    // Direction check
    const prevTrue = trueValues[i][0];
    const actualDir = trueLast > prevTrue ? "UP" : "DOWN";
    const predDir = predLast > prevTrue ? "UP" : "DOWN";

    if (actualDir === predDir) correctDir++;
  }

  mse /= predValues.length;
  mae /= predValues.length;
  const dirAcc = (correctDir / predValues.length) * 100;

  console.log("\n📊 Evaluation Results:");
  console.log(`MSE: ${mse.toFixed(6)}`);
  console.log(`MAE: ${mae.toFixed(6)}`);
  console.log(`Direction Accuracy: ${dirAcc.toFixed(2)}%`);

  console.log("\n🎯 Step 1.8 Accuracy Evaluation Completed!");
}

testLSTMAccuracy().catch((err) => {
  console.error("❌ Error in Accuracy Test:", err);
});
