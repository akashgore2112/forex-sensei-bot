// test/test-rfc.js
// 📊 Step 1.2 - Random Forest Classifier Test with MTFA Data + Load-or-Train (MACD Flattened)

const SwingSignalClassifier = require("../ml-pipeline/models/random-forest-classifier");
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const fs = require("fs");
const path = require("path");

// ✅ CLI flag check
const args = process.argv.slice(2);
const forceRetrain = args.includes("--force-train");

async function runRFCTest() {
  console.log("🚀 Starting Step 1.2: Random Forest Classifier Test...");

  const classifier = new SwingSignalClassifier();
  const modelPath = path.join(__dirname, "../saved-models/rf-model.json");

  let modelLoaded = false;
  let latestData = null;

  // 🔹 Load model if exists and retrain not forced
  if (!forceRetrain && fs.existsSync(modelPath)) {
    try {
      await classifier.loadModel(modelPath);
      console.log("✅ Pre-trained Random Forest model loaded successfully!");
      modelLoaded = true;
    } catch (err) {
      console.warn("⚠️ Failed to load saved model, will retrain instead:", err.message);
    }
  } else if (forceRetrain) {
    console.log("⚠️ Force retrain requested → skipping model load.");
  }

  // 🔹 Always fetch candles for latest prediction
  console.log("\n📊 Fetching MTFA data for training/prediction...");
  const mtfaResult = await MTFA.analyze("EUR/USD");

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  // 🔹 Recalculate indicators
  const indicators = await SwingIndicators.calculateAll(candles);

  // 🔹 Merge candles + indicators (flattened MACD)
  const processed = candles.map((c, i) => ({
    close: c.close,
    ema20: Array.isArray(indicators.ema20) ? indicators.ema20[i] : indicators.ema20,
    ema50: Array.isArray(indicators.ema50) ? indicators.ema50[i] : indicators.ema50,
    rsi: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
    macd: Array.isArray(indicators.macd?.MACD)
      ? indicators.macd.MACD[i]
      : indicators.macd?.MACD || 0,
    macdSignal: Array.isArray(indicators.macd?.signal)
      ? indicators.macd.signal[i]
      : indicators.macd?.signal || 0,
    atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr,
    volume: c.volume || 1000,
    avgVolume: 1000,
    prevClose: candles[i - 1]?.close || c.close,
  }));

  console.log(`✅ Processed ${processed.length} candles with indicators`);
  latestData = processed[processed.length - 1];

  // 🔹 If model not loaded → retrain
  if (!modelLoaded) {
    console.log("\n🧹 Filtering invalid samples for training...");
    const validProcessed = processed.filter((d) => {
      const values = [
        d.close, d.ema20, d.ema50, d.rsi, d.macd, d.macdSignal,
        d.atr, d.volume, d.avgVolume, d.prevClose,
      ];
      return values.every(v => v !== undefined && !Number.isNaN(v));
    });

    console.log(`📊 Valid samples after filtering: ${validProcessed.length}`);
    if (validProcessed.length < 200) {
      throw new Error("❌ Not enough valid samples for training Random Forest.");
    }

    console.log("\n⚡ Training Random Forest Classifier...");
    try {
      const metrics = await classifier.trainModel(validProcessed);
      console.log("✅ Random Forest Training Completed!");

      if (metrics) {
        console.log("\n📊 Training Metrics (Test Set Evaluation):");
        console.log(`   Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
        console.log(`   Avg F1-Score: ${(metrics.averageF1 * 100).toFixed(2)}%`);
        Object.entries(metrics.classMetrics).forEach(([cls, m]) => {
          console.log(
            `     ${cls}: Precision=${(m.precision * 100).toFixed(1)}%, Recall=${(m.recall * 100).toFixed(1)}%, F1=${(m.f1Score * 100).toFixed(1)}%`
          );
        });
      }

      await classifier.saveModel(modelPath);
    } catch (err) {
      console.error("❌ Training failed:", err.message);
      return;
    }
  }

  // 🔹 Predict on latest candle
  console.log("\n🔮 Making classification on last candle...");
  try {
    const prediction = classifier.predict(latestData);
    console.log("\n📌 Final Classification Result:");
    console.log("──────────────────────────────────────");
    console.dir(prediction, { depth: null });
    console.log("──────────────────────────────────────");
  } catch (err) {
    console.error("❌ Prediction failed:", err.message);
  }

  console.log("\n🎯 Step 1.2 Execution Completed!");
}

runRFCTest().catch((err) => {
  console.error("❌ Error in RFC test:", err);
});
