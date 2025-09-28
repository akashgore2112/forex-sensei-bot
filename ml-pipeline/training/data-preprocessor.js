// ml-pipeline/training/data-preprocessor.js
// 🔄 Data Preprocessor for LSTM (Phase 2 Step 1.4)

const SwingDataFetcher = require("../../swingDataFetcher");
const SwingIndicators = require("../../swing-indicators");
const tf = require("@tensorflow/tfjs-node"); // ✅ TensorFlow import add kiya

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

    // 3. Build feature set
    const processed = candles.map((candle, idx) => {
      return {
        close: candle.close,
        ema20: indicators.ema20[idx] || indicators.ema20[indicators.ema20.length - 1],
        rsi: indicators.rsi14[idx] || indicators.rsi14[indicators.rsi14.length - 1],
        macd: indicators.macd.MACD[idx] || indicators.macd.MACD[indicators.macd.MACD.length - 1],
        atr: indicators.atr[idx] || indicators.atr[indicators.atr.length - 1]
      };
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
          historicalData[j].close,
          historicalData[j].ema20,
          historicalData[j].rsi,
          historicalData[j].macd,
          historicalData[j].atr
        ]);
      }
      features.push(featureWindow);

      const targetWindow = [];
      for (let k = i + 1; k <= i + this.horizon; k++) {
        targetWindow.push(historicalData[k].close);
      }
      targets.push(targetWindow);
    }

    // ✅ Convert arrays into tensors
    const featureTensor = tf.tensor3d(features); // [samples, lookback, 5]
    const targetTensor = tf.tensor2d(targets);   // [samples, horizon]

    return { features: featureTensor, targets: targetTensor };
  }
}

module.exports = DataPreprocessor;
