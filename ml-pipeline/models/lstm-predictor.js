// ml-pipeline/models/lstm-predictor.js
const tf = require("@tensorflow/tfjs-node");
const FeatureNormalizer = require("../feature-engineering/feature-normalizer");

class LSTMPricePredictor {
  constructor() {
    this.model = null;
    this.lookbackPeriod = 60;
    this.predictionHorizon = 5;
    this.normalizer = new FeatureNormalizer();
    this.trainingHistory = null;
  }

  async buildModel() {
    this.model = tf.sequential();

    this.model.add(
      tf.layers.lstm({
        units: 128,              // CHANGED: 50 → 128
        returnSequences: true,
        inputShape: [this.lookbackPeriod, 5],
      })
    );
    this.model.add(tf.layers.dropout({ rate: 0.3 })); // CHANGED: 0.2 → 0.3

    this.model.add(tf.layers.lstm({ 
      units: 64,                 // CHANGED: 50 → 64
      returnSequences: false 
    }));
    this.model.add(tf.layers.dropout({ rate: 0.3 })); // CHANGED: 0.2 → 0.3

    this.model.add(tf.layers.dense({ units: 32, activation: "relu" })); // CHANGED: 25 → 32
    this.model.add(tf.layers.dense({ units: this.predictionHorizon }));

    this.model.compile({
      optimizer: tf.train.adam(0.0005), // CHANGED: 0.001 → 0.0005
      loss: "meanSquaredError",
      metrics: ["mae"],
    });

    console.log("✅ LSTM Model Built Successfully");
    this.model.summary();
  }

  prepareTrainingData(historicalData) {
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
        targetWindow.push(normalized[k].close);
      }
      targets.push(targetWindow);
    }

    return {
      features: tf.tensor3d(features, [features.length, this.lookbackPeriod, 5]),
      targets: tf.tensor2d(targets, [targets.length, this.predictionHorizon]),
    };
  }

  prepareInputFeatures(recentData) {
    const normalized = this.normalizer.transform(recentData);
    const inputFeatures = [
      normalized.slice(-this.lookbackPeriod).map((d) => [
        d.close,
        d.ema20,
        d.rsi,
        d.macd,
        d.atr,
      ]),
    ];
    return tf.tensor3d(inputFeatures, [1, this.lookbackPeriod, 5]);
  }

  calculateConfidence() {
    if (!this.trainingHistory) {
      console.warn("⚠️ No training history available, using default confidence");
      return 0.5;
    }

    const valLoss = this.trainingHistory.history.val_loss;
    const finalValLoss = valLoss[valLoss.length - 1];
    
    const confidence = Math.max(0, Math.min(1, 1 - finalValLoss * 10));
    
    return Number(confidence.toFixed(2));
  }

  determinePriceDirection(predictedPrices, lastClose) {
    const firstPredicted = predictedPrices[0];
    const lastPredicted = predictedPrices[predictedPrices.length - 1];
    
    const trend = lastPredicted - firstPredicted;
    const percentChange = ((lastPredicted - lastClose) / lastClose) * 100;
    
    if (percentChange > 0.3) return "BULLISH";
    if (percentChange < -0.3) return "BEARISH";
    return "NEUTRAL";
  }

  calculateVolatility(recentData) {
    const avgAtr = recentData
      .slice(-this.lookbackPeriod)
      .reduce((sum, d) => sum + (d.atr || 0), 0) / this.lookbackPeriod;
    
    const avgClose = recentData
      .slice(-this.lookbackPeriod)
      .reduce((sum, d) => sum + d.close, 0) / this.lookbackPeriod;
    
    const atrPercent = (avgAtr / avgClose) * 100;
    
    if (atrPercent < 0.5) return "LOW";
    if (atrPercent < 1.0) return "MEDIUM";
    return "HIGH";
  }

  async trainModel(historicalData) {
    if (!this.model) {
      await this.buildModel();
    }

    const { features, targets } = this.prepareTrainingData(historicalData);

    console.log("🎯 Starting LSTM Training...");
    
    this.trainingHistory = await this.model.fit(features, targets, {
      epochs: 150,              // CHANGED: 100 → 150
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 1,
      callbacks: [
        tf.callbacks.earlyStopping({ 
          monitor: 'val_loss',
          patience: 20          // CHANGED: 10 → 20
        })
      ],
    });

    console.log("✅ LSTM Training Completed");
    
    const finalLoss = this.trainingHistory.history.loss.slice(-1)[0];
    const finalValLoss = this.trainingHistory.history.val_loss.slice(-1)[0];
    console.log(`📊 Final Training Loss: ${finalLoss.toFixed(6)}`);
    console.log(`📊 Final Validation Loss: ${finalValLoss.toFixed(6)}`);

    await this.model.save("file://./saved-models/lstm-price-predictor");
    console.log("💾 Model Saved: ./saved-models/lstm-price-predictor");
    
    features.dispose();
    targets.dispose();
  }

  async predict(recentData) {
    if (!this.model) {
      throw new Error("❌ Model not built or loaded. Call buildModel() or load model first.");
    }

    if (recentData.length < this.lookbackPeriod) {
      throw new Error(
        `❌ Need at least ${this.lookbackPeriod} data points, got ${recentData.length}`
      );
    }

    const tensorInput = this.prepareInputFeatures(recentData);
    const prediction = this.model.predict(tensorInput);

    const predictedNormalized = Array.from(await prediction.data());
    const predictedPrices = this.normalizer.inverseTransformClose(predictedNormalized);

    const lastClose = recentData[recentData.length - 1].close;
    const direction = this.determinePriceDirection(predictedPrices, lastClose);
    const confidence = this.calculateConfidence();
    const volatility = this.calculateVolatility(recentData);

    tensorInput.dispose();
    prediction.dispose();

    return {
      predictedPrices: predictedPrices.map((p) => Number(p.toFixed(5))),
      confidence: confidence,
      direction: direction,
      volatility: volatility,
      currentPrice: Number(lastClose.toFixed(5)),
      percentChange: Number((((predictedPrices[predictedPrices.length - 1] - lastClose) / lastClose) * 100).toFixed(2))
    };
  }

  async loadModel(modelPath = "file://./saved-models/lstm-price-predictor/model.json") {
    try {
      this.model = await tf.loadLayersModel(modelPath);
      console.log("✅ LSTM Model Loaded Successfully");
      this.model.summary();
    } catch (err) {
      throw new Error(`❌ Failed to load model: ${err.message}`);
    }
  }
}

module.exports = LSTMPricePredictor;
