// test/test-ml-integration.js
// 📊 Step 1.9 - Real ML Integration Test (No Dummy Values)

const MLPipeline = require("../ml-pipeline/ml-integration");
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");
const tf = require("@tensorflow/tfjs-node");

async function testMLIntegration() {
  console.log("🚀 Starting Step 1.9: ML Integration with Real Data...");

  const mlPipeline = new MLPipeline();

  // 1. Fetch historical data
  console.log("📊 Fetching EUR/USD candles...");
  const candles = await SwingDataFetcher.getDailyData("EUR/USD");
  console.log(`✅ Got ${candles.length} candles`);

  // 2. Calculate indicators
  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // 3. Run ML predictions
  console.log("🤖 Running ML pipeline...");
  const result = await mlPipeline.generateMLPredictions("EUR/USD");

  // === Post-process ===
  // Confidence → LSTM model ke validation loss/MAE se (agar available ho)
  if (result.ml.priceDirection?.mae !== undefined) {
    const mae = result.ml.priceDirection.mae;
    // Normalize confidence: lower MAE → higher confidence
    result.ml.priceDirection.confidence = Math.max(0, 1 - mae / 0.01); 
  }

  // Volatility → ATR ke base par
  if (Array.isArray(indicators.atr)) {
    const latestATR = indicators.atr[indicators.atr.length - 1];
    if (latestATR < 0.005) {
      result.ml.volatilityForecast = { level: "LOW", expectedRange: "20-40 pips" };
    } else if (latestATR < 0.010) {
      result.ml.volatilityForecast = { level: "MEDIUM", expectedRange: "40-80 pips" };
    } else {
      result.ml.volatilityForecast = { level: "HIGH", expectedRange: "80-150 pips" };
    }
  }

  // 4. Print final result
  console.log("\n📌 Final ML Integration Result:");
  console.dir(result, { depth: null });
}

testMLIntegration().catch((err) => {
  console.error("❌ Error in ML Integration Test:", err);
});
