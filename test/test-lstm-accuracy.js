// test/test-lstm-accuracy.js
// 📊 Step 1.8 - Accuracy Evaluation of Saved LSTM Model

const tf = require("@tensorflow/tfjs-node");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");

async function testLSTMAccuracy() {
  console.log("🚀 Starting Step 1.8: Accuracy Evaluation (Saved Model)...");

  // 1. Load saved model
  console.log("📂 Loading saved model...");
  const model = await tf.loadLayersModel("file://./saved-models/lstm-model/model.json");
  console.log("✅ Model loaded successfully!");

  const preprocessor = new DataPreprocessor(60, 5);

  // 2. Fetch data
  console.log("📊 Fetching EUR/USD candles...");
  const candles = await SwingDataFetcher.getDailyData("EUR/USD");
  console.log(`✅ Got ${candles.length} candles`);

  // 3. Add indicators
  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  const processed = candles.map((c, i) => ({
    close: c.close,
    ema20: Array.isArray(indicators.ema20) ? indicators.ema20[i] : indicators.ema20,
    rsi: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
    macd: Array.isArray(indicators.macd.MACD) ? indicators.macd.MACD[i] : indicators.macd.MACD,
    atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr,
  }));

  console.log(`✅ Processed ${processed.length} candles with indicators`);

  // 4. Sequences
  const { features, targets } = preprocessor.createSequences(processed);

  const splitIndex = Math.floor(features.shape[0] * 0.8);
  const testX = features.slice([splitIndex, 0, 0], [features.shape[0] - splitIndex, 60, 5]);
  const testY = targets.slice([splitIndex, 0], [targets.shape[0] - splitIndex, 5]);

  console.log(`📊 Test size: ${testX.shape[0]}`);

  // 5. Predictions
  console.log("🔮 Running predictions with saved model...");
  const predictions = model.predict(testX);
  const predValues = await predictions.array();
  const trueValues = await testY.array();

  // 6. Metrics
  let mse = 0, mae = 0, correctDir = 0;

  for (let i = 0; i < predValues.length; i++) {
    const predLast = predValues[i][predValues[i].length - 1];
    const trueLast = trueValues[i][trueValues[i].length - 1];

    mse += Math.pow(predLast - trueLast, 2);
    mae += Math.abs(predLast - trueLast);

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

  console.log("\n🎯 Step 1.8 Accuracy Evaluation Completed (Saved Model)!");
}

testLSTMAccuracy().catch((err) => {
  console.error("❌ Error in Accuracy Test:", err);
});
