// ml-pipeline/training/data-preprocessor.js
// 🔄 Data Preprocessor for LSTM (Phase 2 Step 1.4 + Debugging)

const SwingDataFetcher = require("../../swingDataFetcher");
const SwingIndicators = require("../../swing-indicators");
const tf = require("@tensorflow/tfjs-node"); // ✅ TensorFlow import

class DataPreprocessor {
  constructor(lookback = 60, horizon = 5) {
    this.lookback = lookback; // 60 days past data
    this.horizon = horizon;   // predict next 5 days
  }

  /**
   * Fetch + preprocess historical market data
   * @param {string} pair - e.g. "EUR/USD"
   * @param {number} limit - candles to fetch
   */
  async prepare(pair = "EUR/USD", limit = 600) {
    console.log(`📊 Preparing training data for ${pair}...`);

    // 1. Get historical candles (Phase 1 system)
    const dailyData = await SwingDataFetcher.getDailyData(pair);
    const candles = dailyData.slice(-limit); // take last N candles

    // 2. Add indicators for each candle
    const indicators = await SwingIndicators.calculateAll(candles);

    // 🛠 Debugging logs (first 5 values)
    console.log("DEBUG EMA20:", indicators.ema20.slice(0, 5));
    console.log("DEBUG RSI14:", indicators.rsi14.slice(0, 5));
    console.log("DEBUG MACD:", indicators.macd ? indicators.macd.MACD?.slice(0, 5) : "MISSING");
    console.log("DEBUG ATR:", indicators.atr.slice(0, 5));

    // 3. Build feature set with safe defaults
    const processed = candles.map((candle, idx) => {
      const dataPoint = {
        close: Number.isFinite(candle.close) ? candle.close : 0,
        ema20: Number.isFinite(indicators.ema20[idx]) ? indicators.ema20[idx] : 0,
        rsi: Number.isFinite(indicators.rsi14[idx]) ? indicators.rsi14[idx] : 0,
        macd: Number.isFinite(indicators.macd?.MACD?.[idx]) ? indicators.macd.MACD[idx] : 0,
        atr: Number.isFinite(indicators.atr[idx]) ? indicators.atr[idx] : 0,
      };

      // 🔎 Debug invalid entries
      if (
        !Number.isFinite(dataPoint.close) ||
        !Number.isFinite(dataPoint.ema20) ||
        !Number.isFinite(dataPoint.rsi) ||
        !Number.isFinite(dataPoint.macd) ||
        !Number.isFinite(dataPoint.atr)
      ) {
        console.warn(`⚠️ Invalid data at index ${idx}:`, dataPoint);
      }

      return dataPoint;
    });

    console.log(`✅ Prepared ${processed.length} candles with indicators`);
    return processed;
  }

  /**
   * Convert processed data into LSTM-friendly sequences (returns Tensors)
   */
  createSequences(historicalData) {
    const features = [];
    const targets = [];

    for (let i = this.lookback; i < historicalData.length - this.horizon; i++) {
      const featureWindow = [];
      for (let j = i - this.lookback; j < i; j++) {
        featureWindow.push([
          Number.isFinite(historicalData[j].close) ? historicalData[j].close : 0,
          Number.isFinite(historicalData[j].ema20) ? historicalData[j].ema20 : 0,
          Number.isFinite(historicalData[j].rsi) ? historicalData[j].rsi : 0,
          Number.isFinite(historicalData[j].macd) ? historicalData[j].macd : 0,
          Number.isFinite(historicalData[j].atr) ? historicalData[j].atr : 0,
        ]);
      }
      features.push(featureWindow);

      const targetWindow = [];
      for (let k = i + 1; k <= i + this.horizon; k++) {
        targetWindow.push(
          Number.isFinite(historicalData[k].close) ? historicalData[k].close : 0
        );
      }
      targets.push(targetWindow);
    }

    // ✅ Convert arrays into tensors
    try {
      const featureTensor = tf.tensor3d(features); // [samples, lookback, 5]
      const targetTensor = tf.tensor2d(targets);   // [samples, horizon]

      return { features: featureTensor, targets: targetTensor };
    } catch (err) {
      console.error("❌ Tensor conversion error:", err.message);
      console.error("Sample bad features:", features[0]);
      console.error("Sample bad targets:", targets[0]);
      throw err;
    }
  }
}

module.exports = DataPreprocessor;
