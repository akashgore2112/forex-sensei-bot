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
   */
  async prepare(pair = "EUR/USD", limit = 600) {
    console.log(`📊 Preparing training data for ${pair}...`);

    // 1. Get historical candles
    const dailyData = await SwingDataFetcher.getDailyData(pair);
    const candles = dailyData.slice(-limit);

    // 2. Add indicators
    const indicators = await SwingIndicators.calculateAll(candles);

    // 🛠 Debugging logs (first 5 values)
    console.log("DEBUG EMA20:", indicators.ema20?.slice(0, 5));
    console.log("DEBUG RSI14:", indicators.rsi14?.slice(0, 5));
    console.log("DEBUG MACD:", indicators.macd ? indicators.macd.MACD?.slice(0, 5) : "MISSING");
    console.log("DEBUG ATR:", indicators.atr?.slice(0, 5));

    // 3. Build feature set with safe defaults
    const processed = candles.map((candle, idx) => {
      const dataPoint = {
        close: Number.isFinite(candle.close) ? candle.close : 0,
        ema20: Number.isFinite(indicators.ema20?.[idx]) ? indicators.ema20[idx] : 0,
        rsi: Number.isFinite(indicators.rsi14?.[idx]) ? indicators.rsi14[idx] : 0,
        macd: Number.isFinite(indicators.macd?.MACD?.[idx]) ? indicators.macd.MACD[idx] : 0,
        atr: Number.isFinite(indicators.atr?.[idx]) ? indicators.atr[idx] : 0,
      };

      // 🔎 Debug invalid entries
      if (Object.values(dataPoint).some(v => !Number.isFinite(v))) {
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
          historicalData[j].close || 0,
          historicalData[j].ema20 || 0,
          historicalData[j].rsi || 0,
          historicalData[j].macd || 0,
          historicalData[j].atr || 0,
        ]);
      }
      features.push(featureWindow);

      const targetWindow = [];
      for (let k = i; k < i + this.horizon; k++) {
        targetWindow.push(historicalData[k].close || 0);
      }
      targets.push(targetWindow);
    }

    console.log(`📊 Sequences created → Features: ${features.length}, Targets: ${targets.length}`);

    if (!features.length || !targets.length) {
      throw new Error("❌ No sequences generated. Check historical data length.");
    }

    // ✅ Convert arrays into tensors with explicit shapes
    try {
      const featureTensor = tf.tensor3d(features, [features.length, this.lookback, 5]);
      const targetTensor = tf.tensor2d(targets, [targets.length, this.horizon]);
      return { features: featureTensor, targets: targetTensor };
    } catch (err) {
      console.error("❌ Tensor conversion error:", err.message);
      console.error("Sample bad feature window:", features[0]);
      console.error("Sample bad target window:", targets[0]);
      throw err;
    }
  }
}

module.exports = DataPreprocessor;
