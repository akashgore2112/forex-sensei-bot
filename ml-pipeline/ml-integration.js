// ml-pipeline/ml-integration.js
const LSTMPricePredictor = require("./models/lstm-predictor");
const DataPreprocessor = require("./training/data-preprocessor");
const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");

class MLIntegration {
  constructor() {
    this.predictor = new LSTMPricePredictor();
    this.preprocessor = new DataPreprocessor(60, 5);
  }

  async init() {
    console.log("⚡ Loading LSTM model...");
    this.predictor.model = await this.predictor.loadModel("file://./saved-models/lstm-model");
    console.log("✅ Model Loaded");
  }

  async getPrediction(pair = "EUR/USD") {
    console.log(`📊 Fetching real candles for ${pair}...`);
    const candles = await SwingDataFetcher.getDailyData(pair);

    console.log(`✅ Got ${candles.length} candles`);

    // Add indicators
    const indicators = await SwingIndicators.calculateAll(candles);

    // Merge candles + indicators
    const processed = candles.map((c, i) => ({
      close: c.close,
      ema20: indicators.ema20[i],
      rsi: indicators.rsi14[i],
      macd: indicators.macd.MACD[i],
      atr: indicators.atr[i],
    }));

    // Last 70 candles only (to create 60-lookback window + 5 horizon)
    const recent = processed.slice(-70);

    // Convert into ML sequences
    const { features } = this.preprocessor.createSequences(recent);

    // Run prediction
    const prediction = await this.predictor.model.predict(features.slice([0, 0, 0], [1, 60, 5])).array();

    return prediction[0];
  }
}

module.exports = MLIntegration;
