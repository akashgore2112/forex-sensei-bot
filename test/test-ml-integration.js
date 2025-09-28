// test/test-ml-integration.js
// 📊 Step 1.9 - Real ML Integration Test (Final Enhanced Version)

const MLPipeline = require("../ml-pipeline/ml-integration");
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");

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

  // === Post-process Enhancements ===
  console.log("🔧 Enhancing raw ML output...");

  // ✅ Confidence Level
  if (result.ml.signalClassification?.confidence) {
    const conf = parseFloat(result.ml.signalClassification.confidence.replace("%", ""));
    let confidenceLevel = "LOW";
    if (conf > 60) confidenceLevel = "MEDIUM";
    if (conf > 80) confidenceLevel = "HIGH";

    result.ml.signalClassification.confidenceLevel = confidenceLevel;
  }

  // ✅ Volatility Forecast with Pip Ranges
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

  // ✅ Add timestamp for tracking
  result.timestamp = new Date().toISOString();

  // 4. Print final structured result
  console.log("\n📌 Final ML Integration Result:");
  console.dir(result, { depth: null });
}

testMLIntegration().catch((err) => {
  console.error("❌ Error in ML Integration Test:", err);
});
