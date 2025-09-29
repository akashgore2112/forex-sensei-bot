// test/test-volatility.js
const VolatilityPredictor = require("../ml-pipeline/models/volatility-predictor");
const { trainVolatilityModel } = require("../ml-pipeline/training/volatility-trainer");
const fs = require("fs");

async function runTest() {
  console.log("🚀 Testing Volatility Predictor...");

  const predictor = new VolatilityPredictor();
  const modelPath = "./saved-models/volatility-model.json";

  if (fs.existsSync(modelPath)) {
    console.log("📂 Loading existing model...");
    await predictor.loadModel(modelPath);
  } else {
    console.log("⚠️ No saved model found → training new one...");
    await trainVolatilityModel();
    await predictor.loadModel(modelPath);
  }

  const MTFA = require("../mtfa");
  const SwingIndicators = require("../swing-indicators");

  console.log("📊 Fetching latest data...");
  const mtfa = await MTFA.analyze("EUR/USD");
  const candles = mtfa.dailyCandles;
  const indicators = await SwingIndicators.calculateAll(candles);

  const processed = candles.map((c, i) => ({
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume,
    atr: indicators.atr?.[i] || 0,
    rsi: indicators.rsi14?.[i] || 50,
    adx: indicators.adx?.[i] || 20,
    avgVolume:
      candles
        .slice(Math.max(0, i - 20), i)
        .map(x => x.volume || 0)
        .reduce((a, b) => a + b, 0) / Math.min(i || 1, 20)
  }));

  console.log("🔮 Making prediction on latest candle...");
  const forecast = await predictor.predict(processed);

  console.log("\n📌 VOLATILITY FORECAST:");
  console.log(JSON.stringify(forecast, null, 2));
}

runTest().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
