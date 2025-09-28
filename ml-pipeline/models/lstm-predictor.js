// ml-pipeline/models/lstm-predictor.js
// 📘 LSTM Price Predictor (Phase 2 - Step 1.1 Final with MTFA input)

const tf = require("@tensorflow/tfjs-node");

class LSTMPricePredictor {
  constructor() {
    this.model = null;
    this.lookbackPeriod = 60;
    this.predictionHorizon = 5;
  }

  async buildModel() {
    this.model = tf.sequential();

    this.model.add(
      tf.layers.lstm({
        units: 50,
        returnSequences: true,
        inputShape: [this.lookbackPeriod, 5], // MTFA: close, ema20, rsi, macd, atr
      })
    );
    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(tf.layers.lstm({ units: 50, returnSequences: false }));
    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(tf.layers.dense({ units: 25, activation: "relu" }));
    this.model.add(tf.layers.dense({ units: this.predictionHorizon }));

    this.model.compile({
      optimizer: "adam",
      loss: "meanSquaredError",
      metrics: ["mae"],
    });

    console.log("✅ LSTM Model Built Successfully");
  }

  prepareInputFeatures(recentData) {
    const inputFeatures = [
      recentData.slice(-this.lookbackPeriod).map((d) => [
        d.close,
        d.ema20,
        d.rsi14,
        d.macd?.macd || 0,
        d.atr,
      ]),
    ];
    return tf.tensor3d(inputFeatures);
  }

  async calculateConfidence(predictionTensor, lastClose) {
    const predictedArray = await predictionTensor.data();
    const lastPredicted = predictedArray[predictedArray.length - 1];
    const error = Math.abs(lastPredicted - lastClose) / lastClose;
    return Math.max(0, 1 - error);
  }

  determinePriceDirection(predictedArray, lastClose) {
    const lastPredicted = predictedArray[predictedArray.length - 1];
    return lastPredicted > lastClose ? "BULLISH" : "BEARISH";
  }

  async predict(recentData) {
    if (!this.model) {
      throw new Error("Model not built or loaded. Call buildModel() first.");
    }

    const tensorInput = this.prepareInputFeatures(recentData);
    const prediction = this.model.predict(tensorInput);
    const predictedPrices = Array.from(await prediction.data());

    const lastClose = recentData[recentData.length - 1].close;
    const direction = this.determinePriceDirection(predictedPrices, lastClose);
    const confidence = await this.calculateConfidence(prediction, lastClose);

    const avgAtr =
      recentData.slice(-this.lookbackPeriod).reduce((sum, d) => sum + (d.atr || 0), 0) /
      this.lookbackPeriod;
    let volatility = "LOW";
    if (avgAtr > 0.005) volatility = "MEDIUM";
    if (avgAtr > 0.01) volatility = "HIGH";

    return {
      predictedPrices: predictedPrices.map((p) => Number(p.toFixed(5))),
      confidence: Number(confidence.toFixed(2)),
      direction,
      volatility,
    };
  }
}

module.exports = LSTMPricePredictor;
