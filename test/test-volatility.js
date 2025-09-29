// test/test-volatility.js
// 🧪 Volatility Predictor Test Runner

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const VolatilityTrainer = require("../ml-pipeline/training/volatility-trainer");

async function processCandles(pair = "EUR/USD") {
  console.log(`📊 Fetching MTFA data for ${pair}...`);
  const mtfaResult = await MTFA.analyze(pair);

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  console.log("📈 Calculating indicators on MTFA candles...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // 🔄 Merge candles + indicators
  console.log("🔄 Merging candles with indicators...");
  const processed = candles.map((c, i) => ({
    ...c,
    ema20: indicators.ema20?.[i] || 0,
    ema50: indicators.ema50?.[i] || 0,
    rsi: indicators.rsi14?.[i] || 0,
    atr: indicators.atr?.[i] || 0,
    macd: {
      macd: indicators.macd?.macd?.[i] || 0,
      signal: indicators.macd?.signal?.[i] || 0,
    },
    volume: c.volume || 0,
    avgVolume: indicators.avgVolume?.[i] || c.volume || 1,
  }));

  // 🧹 Filter invalid samples
  const validProcessed = processed.filter(
    (d) =>
      d.close &&
      d.atr &&
      d.rsi !== undefined &&
      d.ema20 !== undefined &&
      d.ema50 !== undefined
  );

  console.log(`📊 Valid samples: ${validProcessed.length}/${processed.length}`);
  return validProcessed;
}

async function runVolatilityTest() {
  console.log("🚀 Starting Volatility Predictor Test...");
  const trainer = new VolatilityTrainer();

  try {
    // 🔹 STEP 1: Prepare data
    const processed = await processCandles("EUR/USD");

    // 🔹 STEP 2: Train model
    const metrics = await trainer.trainVolatilityModel(processed);

    console.log("\n✅ Training complete!");
    console.log(`   MAE: ${metrics.meanAbsoluteError.toFixed(6)}\n`);

    // 🔹 STEP 3: Prediction on latest candle
    const predictor = trainer.getPredictor();
    const latestData = processed[processed.length - 1];
    const forecast = predictor.predict(latestData);

    console.log("🔮 Volatility Forecast (latest candle):");
    console.log("──────────────────────────────────────");
    console.log(forecast);

    console.log("\n🎯 Test Completed Successfully!");
  } catch (err) {
    console.error("\n❌ Test failed:", err.message);
    console.error(err.stack);
  }
}

// Main
runVolatilityTest();
