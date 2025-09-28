// test/test-lstm-real.js
// 📊 Step 1.1 - Real LSTM Test with MTFA Daily Candles + Normalization Debug

const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const MTFA = require("../mtfa"); // ✅ Use Phase 1 MTFA
const SwingIndicators = require("../swing-indicators");

async function runRealLSTMTest() {
  console.log("🚀 Starting Step 1.1: LSTM Training with MTFA Daily Data...");

  const predictor = new LSTMPricePredictor();
  await predictor.buildModel();

  const preprocessor = new DataPreprocessor(60, 5);

  // 1. Fetch MTFA Analysis (Phase 1 System)
  console.log("📊 Running MTFA to fetch candles + indicators...");
  const mtfaResult = await MTFA.analyze("EUR/USD");

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  // 2. Recalculate indicators for consistency (we need arrays)
  console.log("📈 Calculating indicators on MTFA candles...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // 3. Merge candles + indicators
  const processed = candles.map((c, i) => {
    const dp = {
      close: c.close,
      ema20: Array.isArray(indicators.ema20) ? indicators.ema20[i] : indicators.ema20,
      rsi: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
      macd: indicators.macd && Array.isArray(indicators.macd.MACD)
        ? indicators.macd.MACD[i]
        : indicators.macd?.MACD || 0,
      atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr
    };

    // Debug invalid values
    if (Object.values(dp).some(v => v === undefined || isNaN(v))) {
      console.warn(`⚠️ Invalid data at index ${i}:`, dp);
    }

    return dp;
  });

  console.log(`✅ Processed ${processed.length} candles with indicators`);

  // 4. Convert into training sequences
  const { features, targets } = preprocessor.createSequences(processed);
  console.log("📊 Features shape:", features.shape);
  console.log("🎯 Targets shape:", targets.shape);

  // 5. Train model
  console.log("⚡ Training LSTM on MTFA daily data...");
  await predictor.model.fit(features, targets, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: [
      {
        onEpochEnd: (epoch, logs) => {
          console.log(
            `📉 Epoch ${epoch + 1}: loss=${logs.loss.toFixed(6)}, val_loss=${logs.val_loss?.toFixed(6)}`
          );
        }
      }
    ],
  });
  console.log("✅ Training Completed!");

  // 6. Save model
  await predictor.model.save("file://./saved-models/lstm-model");
  console.log("💾 Model Saved to ./saved-models/lstm-model");

  // 7. Predict next 5 days
  console.log("\n🔮 Making 5-day prediction...");
  const recentData = processed.slice(-60); // last 60 days

  try {
    const prediction = await predictor.predict(recentData);

    // ✅ Format output as per plan
    const formattedResult = {
      predictedPrices: prediction.predictedPrices.map(p => Number(p.toFixed(5))),
      confidence: prediction.confidence ?? 0.0,
      direction: prediction.direction,
      volatility: prediction.volatility ?? "UNKNOWN"
    };

    console.log("\n📌 Final Prediction Result:");
    console.dir(formattedResult, { depth: null });
  } catch (err) {
    console.error("❌ Prediction failed:", err.message);
  }
}

runRealLSTMTest().catch((err) => {
  console.error("❌ Error in LSTM real test:", err);
});
