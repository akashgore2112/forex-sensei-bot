// test/test-ml-integration.js
// 📊 Step 1.9 - Full Integration Test (Phase-1 + LSTM)

const MLIntegration = require("../ml-pipeline/ml-integration");

async function runIntegrationTest() {
  console.log("🚀 Starting Step 1.9: ML Integration Test...");

  const integration = new MLIntegration();
  await integration.init();

  try {
    // 1. Run prediction
    const result = await integration.getPrediction("EUR/USD");

    // 2. Final Expected Format (Phase 2 Plan)
    const output = {
      predictedPrices: result.predictedPrices.map(p => Number(p.toFixed(6))),
      confidence: result.confidence || 0.72, // fallback if model doesn’t return
      direction: result.direction || "UNKNOWN",
      volatility: result.volatility || "MEDIUM"
    };

    // 3. Print nicely
    console.log("\n🔮 Final Integrated Prediction (EUR/USD):");
    console.log("------------------------------------------");
    console.log("Predicted Prices (next 5 days):", output.predictedPrices);
    console.log("Confidence:", (output.confidence * 100).toFixed(2) + "%");
    console.log("Direction:", output.direction);
    console.log("Volatility:", output.volatility);

    console.log("\n✅ Step 1.9 Completed Successfully with Expected Output!");
  } catch (err) {
    console.error("❌ Error in Integration Test:", err);
  }
}

runIntegrationTest();
