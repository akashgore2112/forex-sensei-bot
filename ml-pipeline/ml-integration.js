// ml-pipeline/ml-integration.js
// 🤖 Phase 2 - Step 1.9: ML Integration Layer with Confidence + Volatility

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
        this.predictor.model = await tf.loadLayersModel(
          "file://./saved-models/LSTM-model/model.json"
        );
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

    // ✅ Normalize indicator outputs (handle array/singleton cases)
    const processed = candles.map((c, i) => ({
      close: c.close,
      ema20: Array.isArray(indicators.ema20) ? indicators.ema20[i] : indicators.ema20,
      rsi: Array.isArray(indicators.rsi14) ? indicators.rsi14[i] : indicators.rsi14,
      macd: Array.isArray(indicators.macd?.MACD) ? indicators.macd.MACD[i] : indicators.macd?.MACD,
      atr: Array.isArray(indicators.atr) ? indicators.atr[i] : indicators.atr,
    }));

    console.log(`✅ Processed ${processed.length} candles with indicators`);

    // ✅ Create sequences
    const { features } = this.preprocessor.createSequences(processed);

    // Last input batch for prediction
    const testX = features.slice([features.shape[0] - 1, 0, 0], [1, 60, 5]);
    const prediction = this.predictor.model.predict(testX);
    const predValues = await prediction.array();

    const lastClose = candles[candles.length - 1].close;
    const predictedClose = predValues[0][predValues[0].length - 1];
    const direction = predictedClose > lastClose ? "BULLISH" : "BEARISH";

    // ✅ Confidence calculation (percentage + levels)
    const rawConfidence = Math.max(0, 1 - Math.abs(predictedClose - lastClose) / lastClose);
    const confidencePct = (rawConfidence * 100).toFixed(2);

    let confidenceLevel = "LOW";
    if (confidencePct > 60) confidenceLevel = "MEDIUM";
    if (confidencePct > 80) confidenceLevel = "HIGH";

    // ✅ Volatility from ATR
    const avgAtr =
      processed.slice(-60).reduce((sum, d) => sum + (d.atr || 0), 0) / 60;
    let volatility = "LOW";
    if (avgAtr > 0.005) volatility = "MEDIUM";
    if (avgAtr > 0.01) volatility = "HIGH";

    return {
      pair,
      ml: {
        priceDirection: {
          prediction: direction,
          targetPrice: predictedClose,
          horizon: "5 days",
        },
        signalClassification: {
          signal: direction === "BULLISH" ? "BUY" : "SELL",
          confidence: `${confidencePct}%`,
          confidenceLevel,
        },
        volatilityForecast: { level: volatility },
      },
    };
  }
}

module.exports = MLPipeline;
