// ml-pipeline/ml-integration.js
// 🤖 Phase 2 - Step 1.9: ML Integration Layer

const LSTMPricePredictor = require("./models/lstm-predictor");
const DataPreprocessor = require("./training/data-preprocessor");
const SwingIndicators = require("../swing-indicators");
const SwingDataFetcher = require("../swingDataFetcher");
const tf = require("@tensorflow/tfjs-node");

class MLPipeline {
  constructor() {
    this.predictor = new LSTMPricePredictor();
    this.preprocessor = new DataPreprocessor(60, 5); // lookback=60, horizon=5
    this.modelLoaded = false;
  }

  async loadModelIfNeeded() {
    if (!this.modelLoaded) {
      try {
        console.log("📥 Loading saved LSTM model...");
        this.predictor.model = await tf.loadLayersModel("file://./saved-models/LSTM-model/model.json");
        this.modelLoaded = true;
        console.log("✅ Model loaded successfully!");
      } catch (err) {
        console.warn("⚠️ No saved model found, building new model...");
        await this.predictor.buildModel();
      }
    }
  }

  /**
   * Generate ML predictions for given currency pair
   */
  async generateMLPredictions(pair = "EUR/USD") {
    await this.loadModelIfNeeded();

    console.log(`📊 Fetching candles for ${pair}...`);
    const candles = await SwingDataFetcher.getDailyData(pair);
    const indicators = await SwingIndicators.calculateAll(candles);

    // ✅ Prepare sequences
    const processed = await this.preprocessor.prepare(pair, 5000);
    const { features, targets } = this.preprocessor.createSequences(processed);

    // Last batch for prediction
    const testX = features.slice([features.shape[0] - 1, 0, 0], [1, 60, 5]);
    const prediction = this.predictor.model.predict(testX);
    const predValues = await prediction.array();

    const lastClose = candles[candles.length - 1].close;
    const predictedClose = predValues[0][predValues[0].length - 1];

    const direction = predictedClose > lastClose ? "BULLISH" : "BEARISH";

    return {
      pair,
      ml: {
        priceDirection: {
          prediction: direction,
          targetPrice: predictedClose,
          horizon: "5 days"
        },
        // Placeholder (confidence & volatility set in test file for now)
        signalClassification: { signal: direction === "BULLISH" ? "BUY" : "SELL", confidence: 0.5 },
        volatilityForecast: { level: "UNKNOWN" }
      }
    };
  }
}

module.exports = MLPipeline;
