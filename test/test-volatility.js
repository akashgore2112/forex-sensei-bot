// test/test-volatility.js
// Volatility Predictor Test with Debugging

const VolatilityPredictor = require("../ml-pipeline/models/volatility-predictor");
const trainVolatilityModel = require("../ml-pipeline/training/volatility-trainer");
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const fs = require("fs");
const path = require("path");

const modelPath = path.join(__dirname, "../saved-models/volatility-model.json");

async function runVolatilityTest() {
  console.log("🚀 Testing Volatility Predictor...\n");

  // Step 1: Fetch data from MTFA (Phase 1)
  console.log("📊 Fetching MTFA data for EUR/USD...");
  const mtfaResult = await MTFA.analyze("EUR/USD");

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ No daily candles returned from MTFA. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  // Step 2: Calculate indicators (Phase 1 → SwingIndicators)
  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // Step 3: Merge candles + indicators
  console.log("🔄 Merging candles with indicators...");
  const processed = candles.map((c, i) => ({
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume,
    atr: indicators.atr?.[i],
    rsi: indicators.rsi14?.[i],
    ema20: indicators.ema20?.[i],
    ema50: indicators.ema50?.[i],
    macd: indicators.macd ? {
      macd: indicators.macd.macd?.[i],
      signal: indicators.macd.signal?.[i],
      histogram: indicators.macd.histogram?.[i]
    } : undefined
  }));

  // 🟢 DEBUG: Print first 5 processed candles
  console.log("\n🔍 DEBUG: First 5 processed samples:");
  processed.slice(0, 5).forEach((p, idx) => {
    console.log(`[${idx}]`, JSON.stringify(p, null, 2));
  });

  // Step 4: Filter invalid samples
  const validProcessed = processed.filter(
    d => d.close && d.atr !== undefined && d.rsi !== undefined
  );

  console.log(`\n📊 Valid samples after filtering: ${validProcessed.length}/${processed.length}`);

  if (validProcessed.length < 50) {
    throw new Error(`❌ Not enough valid samples (${validProcessed.length}). Check Phase 1 indicators.`);
  }

  // Step 5: Train or Load Volatility Predictor
  let predictor = new VolatilityPredictor();

  if (fs.existsSync(modelPath)) {
    console.log("📂 Loading saved volatility model...");
    await predictor.loadModel(modelPath);
  } else {
    console.log("⚡ Training new volatility model...");
    await trainVolatilityModel(predictor, validProcessed);
    await predictor.saveModel(modelPath);
  }

  // Step 6: Predict volatility on latest data
  const latestData = validProcessed.slice(-60); // last 60 candles
  const forecast = predictor.predict(latestData);

  console.log("\n📌 Volatility Forecast:");
  console.log(JSON.stringify(forecast, null, 2));
}

runVolatilityTest().catch(err => {
  console.error("\n❌❌❌ FATAL ERROR ❌❌❌");
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
