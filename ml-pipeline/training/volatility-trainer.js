// ml-pipeline/training/volatility-trainer.js
// 📊 Training pipeline for Volatility Predictor

const VolatilityPredictor = require("../models/volatility-predictor");
const MTFA = require("../../mtfa");
const SwingIndicators = require("../../swing-indicators");
const fs = require("fs");
const path = require("path");

const modelPath = path.join(__dirname, "../../saved-models/volatility-model.json");

// Helper: merge candles + indicators
function mergeData(candles, indicators) {
  return candles.map((c, i) => ({
    date: c.date,
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume,
    avgVolume: indicators.avgVolume?.[i] || c.volume,
    atr: indicators.atr?.[i] || 0,
    rsi: indicators.rsi?.[i] || 50,
    adx: indicators.adx?.[i] || 20
  }));
}

async function trainVolatilityModel(forceRetrain = false, pair = "EUR/USD") {
  const predictor = new VolatilityPredictor();

  // Load if exists
  if (!forceRetrain && fs.existsSync(modelPath)) {
    try {
      await predictor.loadModel(modelPath);
      console.log("✅ Loaded existing Volatility Model");
      return predictor;
    } catch (err) {
      console.warn("⚠️ Failed to load model, retraining instead:", err.message);
    }
  }

  // Fetch MTFA data
  console.log(`📡 Fetching MTFA data for ${pair}...`);
  const mtfaResult = await MTFA.analyze(pair);

  if (!mtfaResult?.dailyCandles?.length) {
    throw new Error("❌ No daily candles returned from MTFA");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles`);

  // Calculate indicators
  console.log("📈 Calculating indicators...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // Merge
  console.log("🔄 Merging candles + indicators...");
  const processed = mergeData(candles, indicators);

  // Filter valid
  const validData = processed.filter(d =>
    d.close && d.atr && d.rsi && d.adx && d.volume
  );

  console.log(`✅ Valid samples: ${validData.length}/${processed.length}`);

  if (validData.length < 300) {
    throw new Error("❌ Not enough valid samples to train volatility model (need 300+)");
  }

  // Train
  console.log("⚡ Training Volatility Predictor...");
  const metrics = await predictor.trainModel(validData);

  console.log("📊 Training Results:");
  console.log(`   Samples: ${metrics.samples}`);
  console.log(`   MAE: ${metrics.mae.toFixed(5)}`);
  console.log(`   MAE%: ${metrics.maePercent.toFixed(2)}%`);

  // Save
  await predictor.saveModel(modelPath);
  console.log(`💾 Model saved to ${modelPath}`);

  return predictor;
}

module.exports = { trainVolatilityModel };
