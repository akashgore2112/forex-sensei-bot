// test/test-rfc.js
// 📊 Step 1.2 - Test Random Forest Classifier with MTFA Daily Candles

const SwingSignalClassifier = require("../ml-pipeline/models/random-forest-classifier");
const MTFA = require("../mtfa"); // Phase 1 ka MTFA
const SwingIndicators = require("../swing-indicators");

async function runRFCTest() {
  console.log("🚀 Starting Step 1.2: Random Forest Classifier Test...");

  // 1. Get MTFA analysis
  console.log("📊 Running MTFA to fetch candles + indicators...");
  const mtfaResult = await MTFA.analyze("EUR/USD");

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  // 2. Recalculate indicators for consistency
  console.log("📈 Calculating indicators on MTFA candles...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // 3. Merge candles + indicators
  const processed = candles.map((c, i) => ({
    close: c.close,
    ema20: Array.isArray(indicators.ema20) ? indicators.ema20[i] : indicators.ema20,
    ema50: Array.isArray(indicators.ema50) ? indicators.ema50[i] : indicators.ema50,
    ema200: Array.isArray(indicators.ema200) ? indicators.ema200[i] : indicators.ema200,
    rsi14: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
    macd: indicators.macd && Array.isArray(indicators.macd.MACD)
      ? { macd: indicators.macd.MACD[i], signal: indicators.macd.signal[i] }
      : { macd: 0, signal: 0 },
    atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr,
    bollinger: indicators.bollinger
      ? {
          upper: indicators.bollinger.upper[i],
          middle: indicators.bollinger.middle[i],
          lower: indicators.bollinger.lower[i],
        }
      : null,
    volume: c.volume || 1000,
    avgVolume: 1000, // fallback
    prevClose: candles[i - 1]?.close || c.close,
  }));

  console.log(`✅ Processed ${processed.length} candles with indicators`);

  // 4. Train Random Forest Classifier
  const classifier = new SwingSignalClassifier();
  await classifier.trainModel(processed);

  // 5. Predict on the most recent candle
  console.log("\n🔮 Making prediction for latest market data...");
  const latestData = processed[processed.length - 1];
  const prediction = classifier.predict(latestData);

  // ✅ Format output
  const formattedResult = {
    signal: prediction.signal,
    confidence: Number(prediction.confidence.toFixed(2)),
    probabilities: {
      BUY: Number(prediction.probabilities.BUY.toFixed(2)),
      SELL: Number(prediction.probabilities.SELL.toFixed(2)),
      HOLD: Number(prediction.probabilities.HOLD.toFixed(2)),
    },
  };

  console.log("\n📌 Final Random Forest Prediction Result:");
  console.dir(formattedResult, { depth: null });
}

runRFCTest().catch((err) => {
  console.error("❌ Error in Random Forest Test:", err);
});
