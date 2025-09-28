// ml-pipeline/models/lstm-predictor.js
// 📘 LSTM Price Predictor (Phase 2 - Step 1.1 Final with Normalization + MTFA input)

const tf = require("@tensorflow/tfjs-node");
const FeatureNormalizer = require("../feature-engineering/feature-normalizer"); // ✅ Normalizer import

class LSTMPricePredictor {
  constructor() {
    this.model = null;
    this.lookbackPeriod = 60;
    this.predictionHorizon = 5;
    this.normalizer = new FeatureNormalizer(); // ✅ init
  }

  // 🔹 Build LSTM Model
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

  // 🔹 Prepare Training Data with Normalization
  prepareTrainingData(historicalData) {
    // Normalize first
    const normalized = this.normalizer.normalizeDataset(historicalData);

    const features = [];
    const targets = [];

    for (let i = this.lookbackPeriod; i < normalized.length - this.predictionHorizon; i++) {
      const featureWindow = [];
      for (let j = i - this.lookbackPeriod; j < i; j++) {
        featureWindow.push([
          normalized[j].close,
          normalized[j].ema20,
          normalized[j].rsi,
          normalized[j].macd,
          normalized[j].atr,
        ]);
      }
      features.push(featureWindow);

      const targetWindow = [];
      for (let k = i + 1; k <= i + this.predictionHorizon; k++) {
        targetWindow.push(normalized[k].close); // target = normalized close
      }
      targets.push(targetWindow);
    }

    return {
      features: tf.tensor3d(features),
      targets: tf.tensor2d(targets),
    };
  }

  // 🔹 Prepare Input Features (Normalized)
  prepareInputFeatures(recentData) {
    const normalized = this.normalizer.normalizeDataset(recentData);
    const inputFeatures = [
      normalized.slice(-this.lookbackPeriod).map((d) => [
        d.close,
        d.ema20,
        d.rsi,
        d.macd,
        d.atr,
      ]),
    ];
    return tf.tensor3d(inputFeatures);
  }

  // 🔹 Confidence Calculation
  async calculateConfidence(predictionTensor, lastClose) {
    const predictedArray = await predictionTensor.data();
    const predictedPrices = predictedArray.map((p) =>
      this.normalizer.inverseTransformClose(p)
    ); // inverse transform

    const lastPredicted = predictedPrices[predictedPrices.length - 1];
    const error = Math.abs(lastPredicted - lastClose) / lastClose;
    return Math.max(0, 1 - error);
  }

  // 🔹 Direction
  determinePriceDirection(predictedArray, lastClose) {
    const lastPredicted = predictedArray[predictedArray.length - 1];
    return lastPredicted > lastClose ? "BULLISH" : "BEARISH";
  }

  // 🔹 Train Model
  async trainModel(historicalData) {
    const { features, targets } = this.prepareTrainingData(historicalData);

    await this.model.fit(features, targets, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: tf.callbacks.earlyStopping({ patience: 10 }),
    });

    console.log("✅ LSTM Training Completed");

    await this.model.save("file://./saved-models/lstm-price-predictor");
    console.log("💾 Model Saved: ./saved-models/lstm-price-predictor");
  }

  // 🔹 Predict Next Prices (with inverse transform)
  async predict(recentData) {
    if (!this.model) {
      throw new Error("Model not built or loaded. Call buildModel() first.");
    }

    const tensorInput = this.prepareInputFeatures(recentData);
    const prediction = this.model.predict(tensorInput);

    const predictedNormalized = Array.from(await prediction.data());
    const predictedPrices = predictedNormalized.map((p) =>
      this.normalizer.inverseTransformClose(p)
    );

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
