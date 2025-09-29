// ml-pipeline/models/lstm-predictor.js
// 📘 LSTM Price Predictor - FIXED VERSION with Better Confidence

const tf = require("@tensorflow/tfjs-node");
const FeatureNormalizer = require("../feature-engineering/feature-normalizer");

class LSTMPricePredictor {
  constructor() {
    this.model = null;
    this.lookbackPeriod = 60;
    this.predictionHorizon = 5;
    this.normalizer = new FeatureNormalizer();
    this.trainingHistory = null; // ✅ Store training history for confidence
  }

  // 🔹 Build LSTM Model
  async buildModel() {
    this.model = tf.sequential();

    this.model.add(
      tf.layers.lstm({
        units: 50,
        returnSequences: true,
        inputShape: [this.lookbackPeriod, 5], // [close, ema20, rsi, macd, atr]
      })
    );
    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(tf.layers.lstm({ units: 50, returnSequences: false }));
    this.model.add(tf.layers.dropout({ rate: 0.2 }));

    this.model.add(tf.layers.dense({ units: 25, activation: "relu" }));
    this.model.add(tf.layers.dense({ units: this.predictionHorizon })); // Predict 5 closes

    this.model.compile({
      optimizer: tf.train.adam(0.001), // ✅ Explicit learning rate
      loss: "meanSquaredError",
      metrics: ["mae"],
    });

    console.log("✅ LSTM Model Built Successfully");
    this.model.summary(); // ✅ Show model architecture
  }

  // 🔹 Prepare Training Data with Normalization
  prepareTrainingData(historicalData) {
    // ✅ Normalize all features using feature normalizer
    const normalized = this.normalizer.normalizeDataset(historicalData);

    const features = [];
    const targets = [];

    for (let i = this.lookbackPeriod; i < normalized.length - this.predictionHorizon; i++) {
      const featureWindow = [];
      
      for (let j = i - this.lookbackPeriod; j < i; j++) {
        featureWindow.push([
          normalized[j].close,
          normalized[j].ema20,
          normalized[j].rsi,    // ✅ FIXED: consistent naming
          normalized[j].macd,
          normalized[j].atr,
        ]);
      }
      features.push(featureWindow);

      // Target: next 5 days normalized close prices
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

  // 🔹 Prepare Input Features for Prediction (Normalized)
  prepareInputFeatures(recentData) {
    const normalized = this.normalizer.transform(recentData);
    const inputFeatures = [
      normalized.slice(-this.lookbackPeriod).map((d) => [
        d.close,
        d.ema20,
        d.rsi,    // ✅ FIXED
        d.macd,
        d.atr,
      ]),
    ];
    return tf.tensor3d(inputFeatures, [1, this.lookbackPeriod, 5]);
  }

  // 🔹 ✅ IMPROVED: Calculate Confidence from Training History
  calculateConfidence() {
    if (!this.trainingHistory) {
      console.warn("⚠️ No training history available, using default confidence");
      return 0.5; // Default medium confidence
    }

    // Use validation loss to calculate confidence
    const valLoss = this.trainingHistory.history.val_loss;
    const finalValLoss = valLoss[valLoss.length - 1];
    
    // Lower loss = higher confidence (inverse relationship)
    // Map loss [0, 0.1] → confidence [1.0, 0.0]
    const confidence = Math.max(0, Math.min(1, 1 - finalValLoss * 10));
    
    return Number(confidence.toFixed(2));
  }

  // 🔹 Determine Price Direction
  determinePriceDirection(predictedPrices, lastClose) {
    const firstPredicted = predictedPrices[0];
    const lastPredicted = predictedPrices[predictedPrices.length - 1];
    
    // Check overall trend across all 5 predictions
    const trend = lastPredicted - firstPredicted;
    const percentChange = ((lastPredicted - lastClose) / lastClose) * 100;
    
    if (percentChange > 0.3) return "BULLISH";      // +0.3% or more
    if (percentChange < -0.3) return "BEARISH";     // -0.3% or less
    return "NEUTRAL";                                // Between -0.3% to +0.3%
  }

  // 🔹 Calculate Volatility from ATR
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

  // 🔹 Train Model
  async trainModel(historicalData) {
    if (!this.model) {
      await this.buildModel();
    }

    const { features, targets } = this.prepareTrainingData(historicalData);

    console.log("🎯 Starting LSTM Training...");
    
    this.trainingHistory = await this.model.fit(features, targets, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 1, // Show training progress
      callbacks: [
        tf.callbacks.earlyStopping({ 
          monitor: 'val_loss',
          patience: 10
        })
      ],
    });

    console.log("✅ LSTM Training Completed");
    
    // ✅ Show final metrics
    const finalLoss = this.trainingHistory.history.loss.slice(-1)[0];
    const finalValLoss = this.trainingHistory.history.val_loss.slice(-1)[0];
    console.log(`📊 Final Training Loss: ${finalLoss.toFixed(6)}`);
    console.log(`📊 Final Validation Loss: ${finalValLoss.toFixed(6)}`);

    // Save model
    await this.model.save("file://./saved-models/lstm-price-predictor");
    console.log("💾 Model Saved: ./saved-models/lstm-price-predictor");
    
    // Clean up tensors
    features.dispose();
    targets.dispose();
  }

  // 🔹 Predict Next Prices (with inverse transform)
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

    // ✅ Get normalized predictions and denormalize them
    const predictedNormalized = Array.from(await prediction.data());
    const predictedPrices = this.normalizer.inverseTransformClose(predictedNormalized);

    const lastClose = recentData[recentData.length - 1].close;
    const direction = this.determinePriceDirection(predictedPrices, lastClose);
    const confidence = this.calculateConfidence(); // ✅ Better confidence calculation
    const volatility = this.calculateVolatility(recentData);

    // Clean up tensors
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

  // 🔹 Load Saved Model
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
