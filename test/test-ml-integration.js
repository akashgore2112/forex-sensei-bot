// test/test-ml-integration.js
// 🧪 Testing Step 1.9 Integration

const MLIntegration = require("../ml-pipeline/ml-integration");

async function runIntegrationTest() {
  console.log("🚀 Running Step 1.9: MTFA + ML Integration Test...");

  const integration = new MLIntegration();

  // Dummy Phase 1 MTFA output (simulate strategy signals)
  const mtfaOutput = {
    pair: "EUR/USD",
    signal: "BUY",
    confidence: 0.7,
    indicators: {
      rsi: 45,
      emaTrend: "UP",
      macd: "POSITIVE",
    },
  };

  // Dummy recent candles (60 bars with indicators)
  const recentCandles = Array.from({ length: 60 }, (_, i) => ({
    close: 1.1 + i * 0.001,
    ema20: 1.1 + i * 0.001,
    rsi: 40 + (i % 10),
    macd: 0.01 * i,
    atr: 0.005 * (i % 5),
  }));

  // Run integration
  const result = await integration.integrate(mtfaOutput, recentCandles);

  console.log("\n📌 Integration Output:");
  console.dir(result, { depth: null });
}

runIntegrationTest().catch((err) => {
  console.error("❌ Error in Integration Test:", err);
});
