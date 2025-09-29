// test/test-rfc.js
// 📊 Step 1.2 - Random Forest Classifier Test with MTFA Data + Progress Logs

const SwingSignalClassifier = require("../ml-pipeline/models/random-forest-classifier");
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");

async function runRFCTest() {
  console.log("🚀 Starting Step 1.2: Random Forest Classifier Test...");

  const classifier = new SwingSignalClassifier();

  // 1. Fetch MTFA Analysis
  console.log("📊 Running MTFA to fetch candles + indicators...");
  const mtfaResult = await MTFA.analyze("EUR/USD");

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  // 2. Recalculate indicators
  console.log("📈 Calculating indicators on MTFA candles...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // 3. Merge candles + indicators
  const processed = candles.map((c, i) => ({
    close: c.close,
    ema20: Array.isArray(indicators.ema20) ? indicators.ema20[i] : indicators.ema20,
    ema50: Array.isArray(indicators.ema50) ? indicators.ema50[i] : indicators.ema50,
    rsi: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
    macd:
      indicators.macd && Array.isArray(indicators.macd.MACD)
        ? { macd: indicators.macd.MACD[i], signal: indicators.macd.signal[i] }
        : indicators.macd || { macd: 0, signal: 0 },
    atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr,
    volume: c.volume || 1000,
    avgVolume: 1000,
    prevClose: candles[i - 1]?.close || c.close,
  }));

  console.log(`✅ Processed ${processed.length} candles with indicators`);

  // 4. Filter valid samples
  const validProcessed = processed.filter((d, i) => {
    const values = [
      d.close, d.ema20, d.ema50, d.rsi, d.macd?.macd, d.macd?.signal,
      d.atr, d.volume, d.avgVolume, d.prevClose,
    ];
    const isValid = values.every(v => v !== undefined && !Number.isNaN(v));
    if (!isValid) {
      console.warn(`⚠️ Skipping invalid sample at index ${i}`);
    }
    return isValid;
  });

  console.log(`📊 Valid samples after filtering: ${validProcessed.length}`);

  if (validProcessed.length < 200) {
    throw new Error("❌ Not enough valid samples for training Random Forest.");
  }

  // 5. Train classifier
  try {
    console.log("⚡ Training Random Forest Classifier...");
    await classifier.trainModel(validProcessed);
    console.log("✅ Random Forest Training Completed!");
  } catch (err) {
    console.error("❌ Training failed:", err.message);
    return;
  }

  // 6. Predict last candle
  console.log("\n🔮 Making classification on last candle...");
  try {
    const latestData = validProcessed[validProcessed.length - 1];
    const prediction = classifier.predict(latestData);

    console.log("\n📌 Final Classification Result:");
    console.log("──────────────────────────────────────");
    console.dir(prediction, { depth: null });
    console.log("──────────────────────────────────────");
  } catch (err) {
    console.error("❌ Prediction failed:", err.message);
  }
}

runRFCTest().catch((err) => {
  console.error("❌ Error in RFC test:", err);
});
