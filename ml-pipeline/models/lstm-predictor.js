// ml-pipeline/models/lstm-predictor.js
// 📘 LSTM Price Predictor (Phase 2 - Step 1.1 Final)

const tf = require("@tensorflow/tfjs-node");

class LSTMPricePredictor {
  constructor() {
    this.model = null;
    this.lookbackPeriod = 60; // past 60 days
    this.predictionHorizon = 5; // predict next 5 days
  }

  // 🔹 Build LSTM Model
  async buildModel() {
    this.model = tf.sequential();

    this.model.add(
      tf.layers.lstm({
        units: 50,
        returnSequences: true,
        inputShape: [this.lookbackPeriod, 5] // features: close, ema20, rsi, macd, atr
      })
    );

    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(
      tf.layers.lstm({
        units: 50,
        returnSequences: false
      })
    );

    this.model.add(tf.layers.dropout({ rate: 0.2 }));
    this.model.add(tf.layers.dense({ units: 25, activation: "relu" }));
    this.model.add(tf.layers.dense({ units: this.predictionHorizon }));

    this.model.compile({
      optimizer: "adam",
      loss: "meanSquaredError",
      metrics: ["mae"]
    });

    console.log("✅ LSTM Model Built Successfully");
  }

  // 🔹 Prepare Training Data
  prepareTrainingData(historicalData) {
    const features = [];
    const targets = [];

    for (let i = this.lookbackPeriod; i < historicalData.length - this.predictionHorizon; i++) {
      const featureWindow = [];
      for (let j = i - this.lookbackPeriod; j < i; j++) {
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
      for (let k = i + 1; k <= i + this.predictionHorizon; k++) {
        targetWindow.push(historicalData[k].close);
      }
      targets.push(targetWindow);
    }

    return {
      features: tf.tensor3d(features),
      targets: tf.tensor2d(targets)
    };
  }

  // 🔹 Helper: Prepare input for prediction
  prepareInputFeatures(recentData) {
    const inputFeatures = [
      recentData.slice(-this.lookbackPeriod).map(d => [
        d.close,
        d.ema20,
        d.rsi,
        d.macd,
        d.atr
      ])
    ];
    return tf.tensor3d(inputFeatures);
  }

  // 🔹 Helper: Confidence Calculation
  calculateConfidence(predictionTensor, lastClose) {
    return predictionTensor.data().then(predictedArray => {
      const lastPredicted = predictedArray[predictedArray.length - 1];
      const error = Math.abs(lastPredicted - lastClose) / lastClose;
      return Math.max(0, 1 - error); // higher = more confident
    });
  }

  // 🔹 Helper: Determine Direction
  determinePriceDirection(predictedArray, lastClose) {
    const lastPredicted = predictedArray[predictedArray.length - 1];
    return lastPredicted > lastClose ? "BULLISH" : "BEARISH";
  }

  // 🔹 Train the Model
  async trainModel(historicalData) {
    const { features, targets } = this.prepareTrainingData(historicalData);

    await this.model.fit(features, targets, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: tf.callbacks.earlyStopping({ patience: 10 })
    });

    console.log("✅ LSTM Training Completed");

    await this.model.save("file://./saved-models/lstm-price-predictor");
    console.log("💾 Model Saved: ./saved-models/lstm-price-predictor");
  }

  // 🔹 Predict Next Prices
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

    // Volatility (ATR-based)
    const avgAtr = recentData.slice(-this.lookbackPeriod).reduce((sum, d) => sum + (d.atr || 0), 0) / this.lookbackPeriod;
    let volatility = "LOW";
    if (avgAtr > 0.005) volatility = "MEDIUM";
    if (avgAtr > 0.01) volatility = "HIGH";

    return {
      predictedPrices,
      confidence: Number(confidence.toFixed(2)),
      direction,
      volatility
    };
  }
}

module.exports = LSTMPricePredictor;
