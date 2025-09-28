const fs = require("fs");
const path = require("path");
const tf = require("@tensorflow/tfjs-node");

const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const MTFA = require("../mtfa"); // ✅ Phase 1 MTFA
const SwingIndicators = require("../swing-indicators");

async function runRealLSTMTest() {
  console.log("🚀 Starting Step 1.1: LSTM Training/Loading with MTFA Daily Data...");

  const modelPath = "file://./saved-models/lstm-model";
  const predictor = new LSTMPricePredictor();
  const preprocessor = new DataPreprocessor(60, 5);

  // 1. Fetch MTFA Analysis
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
    rsi: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
    macd: indicators.macd && Array.isArray(indicators.macd.MACD)
      ? indicators.macd.MACD[i]
      : indicators.macd?.MACD || 0,
    atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr
  }));

  console.log(`✅ Processed ${processed.length} candles with indicators`);

  // 4. Load-or-Train Logic
  let modelLoaded = false;
  if (fs.existsSync(path.join("saved-models", "lstm-model", "model.json"))) {
    try {
      predictor.model = await tf.loadLayersModel(modelPath + "/model.json");
      console.log("✅ Pre-trained LSTM Model Loaded Successfully!");
      modelLoaded = true;
    } catch (err) {
      console.warn("⚠️ Failed to load saved model. Retraining...", err.message);
    }
  }

  if (!modelLoaded) {
    console.log("⚡ Training LSTM on MTFA daily data...");
    const { features, targets } = preprocessor.createSequences(processed);

    await predictor.buildModel();
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
    await predictor.model.save(modelPath);
    console.log("💾 Model Saved to ./saved-models/lstm-model");
  }

  // 5. Predict Next 5 Days
  console.log("\n🔮 Making 5-day prediction...");
  const recentData = processed.slice(-60);

  try {
    const prediction = await predictor.predict(recentData);

    // ✅ Format output
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
