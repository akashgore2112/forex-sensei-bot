// ml-pipeline/ml-integration.js
// 🔗 Step 1.9: Integration of Phase 1 (MTFA) + Phase 2 (LSTM ML)

const LSTMPricePredictor = require("./models/lstm-predictor");
const DataPreprocessor = require("./training/data-preprocessor");
const tf = require("@tensorflow/tfjs-node");

class MLIntegration {
  constructor() {
    this.predictor = new LSTMPricePredictor();
    this.preprocessor = new DataPreprocessor(60, 5); // 60-day lookback, 5-day horizon
    this.modelLoaded = false;
  }

  async loadModel() {
    if (!this.modelLoaded) {
      this.predictor.model = await tf.loadLayersModel("file://./saved-models/lstm-model/model.json");
      this.modelLoaded = true;
      console.log("✅ LSTM Model Loaded for Integration");
    }
  }

  /**
   * Integrates MTFA + ML
   * @param {Object} mtfaOutput - Phase 1 system ka output
   * @param {Array} recentCandles - last 60 candles with indicators
   */
  async integrate(mtfaOutput, recentCandles) {
    await this.loadModel();

    // Process data for ML input
    const { features } = this.preprocessor.createSequences(recentCandles);

    if (features.shape[0] === 0) {
      throw new Error("❌ Not enough candles to create ML sequences!");
    }

    // Take only the last sequence
    const lastSequence = features.slice([features.shape[0] - 1, 0, 0], [1, 60, 5]);

    const prediction = await this.predictor.model.predict(lastSequence).array();

    return {
      mtfa: mtfaOutput, // ✅ Phase 1 output
      ml: {
        predictedPrices: prediction[0],
        direction:
          prediction[0][prediction[0].length - 1] > prediction[0][0]
            ? "BULLISH"
            : "BEARISH",
      },
    };
  }
}

module.exports = MLIntegration;
