// test/test-rfc.js
// 📊 Step 1.2 - Random Forest Classifier Test with MTFA Data + Debug

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
  const processed = candles.map((c, i) => {
    const dp = {
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
    };

    // Debug invalid data
    if (Object.values(dp).some((v) => v === undefined || Number.isNaN(v))) {
      console.warn(`⚠️ Debug skipped sample at index ${i}`, dp);
    }

    return dp;
  });

  console.log(`✅ Processed ${processed.length} candles with indicators`);

  // 4. Train classifier
  try {
    await classifier.trainModel(processed);
  } catch (err) {
    console.error("❌ Training failed:", err.message);
    return;
  }

  // 5. Predict last candle
  console.log("\n🔮 Making classification on last candle...");
  try {
    const latestData = processed[processed.length - 1];
    const prediction = classifier.predict(latestData);

    console.log("\n📌 Final Classification Result:");
    console.dir(prediction, { depth: null });
  } catch (err) {
    console.error("❌ Prediction failed:", err.message);
  }
}

runRFCTest().catch((err) => {
  console.error("❌ Error in RFC test:", err);
});
