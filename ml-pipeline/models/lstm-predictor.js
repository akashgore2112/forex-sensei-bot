// ml-pipeline/models/lstm-predictor.js
// 📘 LSTM Price Predictor (Phase 2 - Step 1.2)

const tf = require("@tensorflow/tfjs-node");

class LSTMPricePredictor {
  constructor() {
    this.model = null;
    this.lookbackPeriod = 60; // last 60 days data
    this.predictionHorizon = 5; // predict next 5 days
  }

  // 🔹 Build LSTM Model
  async buildModel() {
    this.model = tf.sequential();

    this.model.add(
      tf.layers.lstm({
        units: 50,
        returnSequences: true,
        inputShape: [this.lookbackPeriod, 5] // 5 features: close, ema20, rsi, macd, atr
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

    for (
      let i = this.lookbackPeriod;
      i < historicalData.length - this.predictionHorizon;
      i++
    ) {
      // Features: last 60 days window
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

      // Target: next 5 days close
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

  // 🔹 Train the Model
  async trainModel(historicalData) {
    const { features, targets } = this.prepareTrainingData(historicalData);

    await this.model.fit(features, targets, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: tf.callbacks.earlyStopping({ patience: 5 })
    });

    console.log("✅ LSTM Training Completed");

    await this.model.save("file://./saved-models/lstm-model");
    console.log("💾 Model Saved: ./saved-models/lstm-model");
  }

  // 🔹 Predict Next Prices
  async predict(recentData) {
    if (!this.model) {
      throw new Error("Model not built or loaded. Call buildModel() first.");
    }

    const inputFeatures = [
      recentData.slice(-this.lookbackPeriod).map(d => [
        d.close,
        d.ema20,
        d.rsi,
        d.macd,
        d.atr
      ])
    ];

    const tensorInput = tf.tensor3d(inputFeatures);
    const prediction = this.model.predict(tensorInput);

    const predictedPrices = Array.from(await prediction.data());

    return {
      predictedPrices,
      direction:
        predictedPrices[predictedPrices.length - 1] >
        recentData[recentData.length - 1].close
          ? "BULLISH"
          : "BEARISH"
    };
  }
}

module.exports = LSTMPricePredictor;
