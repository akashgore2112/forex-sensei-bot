// test/test-volatility.js
// 📊 Test script for Volatility Predictor

const { trainVolatilityModel } = require("../ml-pipeline/training/volatility-trainer");
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");

const args = process.argv.slice(2);
const forceRetrain = args.includes("--force-train");

async function runVolatilityTest() {
  console.log("🚀 Starting Volatility Predictor Test...");
  console.log(`   Mode: ${forceRetrain ? "FORCE RETRAIN" : "LOAD OR TRAIN"}\n`);

  // 🔹 Step 1: Train or Load Model
  const predictor = await trainVolatilityModel(forceRetrain, "EUR/USD");

  // 🔹 Step 2: Fetch fresh data for prediction
  console.log("📡 Fetching latest MTFA data for prediction...");
  const mtfaResult = await MTFA.analyze("EUR/USD");

  if (!mtfaResult?.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} candles for prediction`);

  console.log("📈 Calculating indicators for prediction...");
  const indicators = await SwingIndicators.calculateAll(candles);

  const latestIndex = candles.length - 1;
  const latestData = {
    date: candles[latestIndex].date,
    close: candles[latestIndex].close,
    high: candles[latestIndex].high,
    low: candles[latestIndex].low,
    volume: candles[latestIndex].volume,
    avgVolume: indicators.avgVolume?.[latestIndex] || candles[latestIndex].volume,
    atr: indicators.atr?.[latestIndex] || 0,
    rsi: indicators.rsi?.[latestIndex] || 50,
    adx: indicators.adx?.[latestIndex] || 20
  };

  // 🔹 Step 3: Prediction
  console.log("\n🔮 Making volatility prediction...");
  const forecast = predictor.predict(latestData);

  // 🔹 Step 4: Print results
  console.log("\n📌 VOLATILITY FORECAST RESULT:");
  console.log("───────────────────────────────");
  console.log(`   Date: ${latestData.date}`);
  console.log(`   Current Price: ${latestData.close}`);
  console.log(`   Current ATR: ${forecast.currentVolatility.toFixed(5)}`);
  console.log(`   Predicted ATR (5-day): ${forecast.predictedVolatility.toFixed(5)}`);
  console.log(`   Change: ${forecast.percentChange.toFixed(2)}%`);
  console.log(`   Level: ${forecast.volatilityLevel}`);
  console.log(`   Risk Adjustment: x${forecast.riskAdjustment.toFixed(2)}`);
  console.log(`   Confidence: ${(forecast.confidence * 100).toFixed(1)}%`);
  console.log(`   Recommendation: ${forecast.recommendation}`);
  console.log("───────────────────────────────\n");

  console.log("🎯 Test Completed Successfully!");
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
runVolatilityTest().catch((err) => {
  console.error("\n❌❌❌ FATAL ERROR ❌❌❌");
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
