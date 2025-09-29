// ml-pipeline/training/volatility-trainer.js
const MTFA = require("../../mtfa");
const SwingIndicators = require("../../swing-indicators");
const VolatilityPredictor = require("../models/volatility-predictor");

async function prepareData(pair = "EUR/USD") {
  console.log(`📊 Fetching data for ${pair}...`);
  const mtfa = await MTFA.analyze(pair);

  if (!mtfa?.dailyCandles?.length) {
    throw new Error("❌ No daily candles returned from MTFA!");
  }

  const candles = mtfa.dailyCandles;
  const indicators = await SwingIndicators.calculateAll(candles);

  return candles.map((c, i) => ({
    close: c.close,
    high: c.high,
    low: c.low,
    volume: c.volume,
    atr: indicators.atr?.[i] || 0,
    rsi: indicators.rsi14?.[i] || 50,
    adx: indicators.adx?.[i] || 20,
    avgVolume:
      candles
        .slice(Math.max(0, i - 20), i)
        .map(x => x.volume || 0)
        .reduce((a, b) => a + b, 0) / Math.min(i || 1, 20)
  }));
}

async function trainVolatilityModel() {
  const predictor = new VolatilityPredictor();
  const data = await prepareData("EUR/USD");

  console.log(`✅ Prepared ${data.length} candles for training`);

  const metrics = await predictor.trainModel(data);
  await predictor.saveModel("./saved-models/volatility-model.json");

  return metrics;
}

if (require.main === module) {
  trainVolatilityModel().catch(err => {
    console.error("❌ Training failed:", err);
    process.exit(1);
  });
}

module.exports = { trainVolatilityModel };
