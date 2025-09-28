// test/test-lstm-reload.js
const tf = require("@tensorflow/tfjs-node");
const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");

async function testModelReload() {
  console.log("🔄 Step 1.7: Testing Model Reload...");

  // 1. Load saved model
  const modelPath = "file://./saved-models/lstm-model";
  const reloadedModel = await tf.loadLayersModel(modelPath + "/model.json");

  console.log("✅ Model reloaded successfully!");

  // 2. Wrap into predictor class
  const predictor = new LSTMPricePredictor();
  predictor.model = reloadedModel;

  // 3. Dummy recent data (last 60 days)
  const recentData = [];
  for (let i = 0; i < 60; i++) {
    recentData.push({
      close: 1.10 + i * 0.001,
      ema20: 1.09 + i * 0.001,
      rsi: 50 + (i % 10),
      macd: 0.001 * (i % 5),
      atr: 0.005 + (i % 3) * 0.001,
    });
  }

  // 4. Make prediction
  const prediction = await predictor.predict(recentData);

  console.log("\n📌 Reloaded Model Prediction:");
  console.dir(prediction, { depth: null });
}

testModelReload().catch((err) => {
  console.error("❌ Error in reload test:", err);
});
