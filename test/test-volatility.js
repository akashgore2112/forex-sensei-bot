// ============================================================================
// 📊 Volatility Predictor Test (Phase 2 - Step 1.3)
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const VolatilityPredictor = require("../ml-pipeline/models/volatility-predictor");
const VolatilityTrainer = require("../ml-pipeline/training/volatility-trainer");

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const forceRetrain = args.includes("--force-train");

// ============================================================================
// 📌 Helper: Merge candles + indicators
// ============================================================================
async function processCandles(pair = "EUR/USD") {
  console.log(`📊 Fetching MTFA data for ${pair}...`);
  const mtfaResult = await MTFA.analyze(pair);

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  console.log("📈 Calculating indicators on candles...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // 🔄 Merge candles + indicators
  const processed = candles.map((c, i) => ({
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume || 0,
    rsi: indicators.rsi14?.[i],
    atr: indicators.atr?.[i],
    ema20: indicators.ema20?.[i],
    ema50: indicators.ema50?.[i],
    macd: {
      macd: indicators.macd?.macd?.[i],
      signal: indicators.macd?.signal?.[i],
      histogram: indicators.macd?.histogram?.[i]
    },
    adx: indicators.adx?.[i]
  }));

  // 🧹 Filter invalid samples
  const validProcessed = processed.filter((d) => {
    const values = [
      d.close, d.high, d.low, d.volume,
      d.rsi, d.atr, d.ema20, d.ema50,
      d.macd?.macd, d.macd?.signal
    ];
    return values.every(v => v !== undefined && v !== null && !Number.isNaN(v));
  });

  console.log(`📊 Valid samples after filtering: ${validProcessed.length}/${processed.length}`);

  // Debug first 3
  console.log("\n🔍 Sample processed data (first 3 rows):");
  console.log(JSON.stringify(validProcessed.slice(0, 3), null, 2));

  return validProcessed;
}

// ============================================================================
// 📌 Main test runner
// ============================================================================
async function runVolatilityTest() {
  console.log("🚀 Starting Volatility Predictor Test...");
  console.log(`   Mode: ${forceRetrain ? "FORCE RETRAIN" : "LOAD OR TRAIN"}\n`);

  const modelPath = path.join(__dirname, "../saved-models/volatility-model.json");
  const predictor = new VolatilityPredictor();
  const trainer = new VolatilityTrainer();

  let processedData = null;
  let modelLoaded = false;

  // STEP 1: Load Model
  if (!forceRetrain && fs.existsSync(modelPath)) {
    try {
      await predictor.loadModel(modelPath);
      console.log("✅ Pre-trained Volatility model loaded successfully!\n");
      modelLoaded = true;
    } catch (err) {
      console.warn("⚠️ Failed to load saved model, will retrain instead:", err.message);
      modelLoaded = false;
    }
  } else if (forceRetrain) {
    console.log("⚠️ Force retrain requested → skipping model load.\n");
  } else {
    console.log("ℹ️ No saved model found, will train new model.\n");
  }

  // STEP 2: Train Model if not loaded
  if (!modelLoaded) {
    processedData = await processCandles("EUR/USD");

    if (processedData.length < 300) {
      throw new Error(`❌ Not enough valid samples to train volatility model (need 300+, got ${processedData.length})`);
    }

    console.log("\n⚡ Training new volatility model...");
    console.log("──────────────────────────────────────\n");

    await trainer.trainVolatilityModel(processedData);
    await predictor.saveModel(modelPath);

    console.log("\n✅ Volatility model training completed!");
    console.log("══════════════════════════════════════\n");
  } else {
    processedData = await processCandles("EUR/USD");
  }

  // STEP 3: Prediction on latest data
  console.log("═══════════════════════════════════════");
  console.log("       PREDICTION ON LATEST DATA");
  console.log("═══════════════════════════════════════\n");

  if (!processedData || processedData.length === 0) {
    throw new Error("❌ No processed data available for prediction");
  }

  console.log("🔮 Making volatility prediction on latest candle...");

  try {
    const prediction = predictor.predict(processedData);

    console.log("\n📌 VOLATILITY FORECAST:");
    console.log("──────────────────────────────────────");
    console.log(`   Predicted Volatility: ${prediction.predictedVolatility.toFixed(5)}`);
    console.log(`   Current Volatility:   ${prediction.currentVolatility.toFixed(5)}`);
    console.log(`   Percent Change:       ${prediction.percentChange.toFixed(2)}%`);
    console.log(`   Volatility Level:     ${prediction.volatilityLevel}`);
    console.log(`   Risk Adjustment:      ${prediction.riskAdjustment.toFixed(2)}x`);
    console.log(`   Confidence:           ${(prediction.confidence * 100).toFixed(1)}%`);
    console.log(`   Recommendation:       ${prediction.recommendation}`);
    console.log("──────────────────────────────────────\n");
  } catch (err) {
    console.error("❌ Prediction failed:", err.message);
    console.error(err.stack);
  }

  console.log("═══════════════════════════════════════");
  console.log("🎯 Volatility Test Completed!");
  console.log("═══════════════════════════════════════");
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
runVolatilityTest().catch((err) => {
  console.error("\n❌❌❌ FATAL ERROR ❌❌❌");
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
