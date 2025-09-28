// test/test-ml-integration.js
// 📊 Step 1.9 - Full Integration Test (Phase-1 + LSTM)

const MLIntegration = require("../ml-pipeline/ml-integration");

async function runIntegrationTest() {
  console.log("🚀 Starting Step 1.9: ML Integration Test...");

  const integration = new MLIntegration();
  await integration.init();

  try {
    // 1. Run prediction
    const prediction = await integration.getPrediction("EUR/USD");

    // 2. Pretty print results
    console.log("\n🔮 Final Integrated Prediction (EUR/USD):");
    console.log("------------------------------------------");
    console.log("📌 Predicted Prices (next 5 days):");
    prediction.predictedPrices.forEach((p, i) => {
      console.log(` Day ${i + 1}: ${p.toFixed(6)}`);
    });

    console.log("\n📊 Additional Info:");
    console.log(` Direction Signal: ${prediction.direction}`);
    console.log(` Raw Output Shape: ${prediction.predictedPrices.length}`);

    console.log("\n🎯 Step 1.9 Integration Test Completed Successfully!");
  } catch (err) {
    console.error("❌ Error in Integration Test:", err);
  }
}

runIntegrationTest();
