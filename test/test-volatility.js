// ============================================================================
// 📊 Volatility Predictor Test (Phase 2 - Step 1.3)
// FIXED: Training in Node.js, Prediction via Python on latest candle
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const VolatilityTrainer = require("../ml-pipeline/training/volatility-trainer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

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

  const processed = candles.map((c, i) => {
    const safe = (arr) => (Array.isArray(arr) && arr[i] !== undefined ? arr[i] : null);

    return {
      close: c.close ?? null,
      high: c.high ?? null,
      low: c.low ?? null,
      volume: c.volume ?? 0,
      avgVolume:
        i >= 20
          ? candles.slice(i - 20, i).reduce((sum, d) => sum + (d.volume || 0), 0) / 20
          : c.volume || 1,
      rsi: safe(indicators.rsi14),
      atr: safe(indicators.atr),
      ema20: safe(indicators.ema20),
      ema50: safe(indicators.ema50),
      macd: {
        macd: safe(indicators.macd?.macd),
        signal: safe(indicators.macd?.signal),
        histogram: safe(indicators.macd?.histogram),
      },
      adx: safe(indicators.adx),
    };
  });

  const validProcessed = processed.filter((d, idx) => {
    const values = [d.close, d.high, d.low, d.volume, d.avgVolume, d.rsi, d.atr, d.adx];
    const isValid = values.every((v) => v !== undefined && v !== null && !Number.isNaN(v));
    if (!isValid) {
      console.warn(`⚠️ Dropped sample @index=${idx} → Missing fields`);
    }
    return isValid;
  });

  console.log(`📊 Valid samples after filtering: ${validProcessed.length}/${processed.length}`);

  console.log("\n🔍 Sample processed data (first 3 rows):");
  console.log(JSON.stringify(validProcessed.slice(0, 3), null, 2));

  return validProcessed;
}

// ============================================================================
// 📌 Call Python predictor for latest candle
// ============================================================================
async function predictWithPython(latestCandle) {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [
      path.join(__dirname, "../ml-pipeline/models/volatility_predictor.py"),
    ]);

    let output = "";
    let error = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`❌ Python predictor failed: ${error}`));
      }

      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (err) {
        reject(new Error(`❌ Failed to parse Python output: ${output}\n${err.message}`));
      }
    });

    // ✅ Only send latest candle (fix for EPIPE)
    py.stdin.write(JSON.stringify(latestCandle));
    py.stdin.end();
  });
}

// ============================================================================
// 📌 Main test runner
// ============================================================================
async function runVolatilityTest() {
  console.log("🚀 Starting Volatility Predictor Test...");
  console.log(`   Mode: ${forceRetrain ? "FORCE RETRAIN" : "LOAD OR TRAIN"}\n`);

  const modelPath = path.join(__dirname, "../saved-models/volatility-model.json");
  const trainer = new VolatilityTrainer();
  let processedData = null;

  // STEP 1: Train or Load Model
  if (!forceRetrain && fs.existsSync(modelPath)) {
    try {
      await trainer.loadExistingModel();
      console.log("✅ Pre-trained Volatility model loaded successfully!\n");
    } catch (err) {
      console.warn("⚠️ Failed to load saved model, will retrain instead:", err.message);
      processedData = await processCandles("EUR/USD");
      await trainer.trainVolatilityModel(processedData);
    }
  } else {
    processedData = await processCandles("EUR/USD");

    if (processedData.length < 500) {
      throw new Error(`❌ Not enough valid samples (need 500+, got ${processedData.length})`);
    }

    console.log("\n⚡ Training new volatility model...");
    console.log("──────────────────────────────────────\n");
    await trainer.trainVolatilityModel(processedData);
    console.log("\n✅ Volatility model training completed!");
  }

  // STEP 2: Prediction with Python
  processedData = processedData || (await processCandles("EUR/USD"));
  const latest = processedData[processedData.length - 1];
  const prediction = await predictWithPython(latest);

  console.log("\n📌 VOLATILITY FORECAST:");
  console.log("──────────────────────────────────────");
  console.log(`   Predicted Volatility: ${prediction.predictedVolatility.toFixed(6)}`);
  console.log(`   Current Volatility:   ${prediction.currentVolatility.toFixed(6)}`);
  console.log(`   Percent Change:       ${prediction.percentChange.toFixed(2)}%`);
  console.log(`   Volatility Level:     ${prediction.volatilityLevel}`);
  console.log(`   Risk Adjustment:      ${prediction.riskAdjustment.toFixed(2)}x`);
  console.log(`   Confidence:           ${(prediction.confidence * 100).toFixed(1)}%`);
  console.log(`   Recommendation:       ${prediction.recommendation}`);
  console.log("──────────────────────────────────────\n");

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
  process.exit(1);
});
