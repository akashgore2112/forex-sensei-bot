// test/test-lstm.js
// 🧪 Test script for LSTM Price Predictor (Phase 2 Step 1.3)

const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");

async function runLSTMTest() {
  console.log("🚀 Starting LSTM Predictor Test...\n");

  // ✅ Dummy historical data (normally from Phase 1 indicators)
  const historicalData = [];
  for (let i = 0; i < 120; i++) {
    historicalData.push({
      close: 1.1000 + Math.sin(i / 10) * 0.01, // mock price pattern
      ema20: 1.1000 + Math.sin(i / 15) * 0.01,
      rsi: 50 + Math.sin(i / 20) * 10,
      macd: Math.sin(i / 25) * 0.005,
      atr: 0.007 + Math.random() * 0.002
    });
  }

  // ✅ Initialize predictor
  const predictor = new LSTMPricePredictor();
  await predictor.buildModel();

  console.log("📊 Training LSTM model on dummy data...");
  await predictor.trainModel(historicalData);

  console.log("\n🔮 Making prediction for next 5 days...");
  const prediction = await predictor.predict(historicalData);

  console.log("\n✅ Prediction Result:");
  console.dir(prediction, { depth: null });
}

runLSTMTest().catch(err => {
  console.error("❌ Error running LSTM test:", err);
});
