// ============================================================================
// 📊 XGBoost Volatility Predictor - FIXED VERSION
// Phase 2 - Step 1.3
// Goal: Predict next 5-day volatility (ATR-based) for risk management
// ============================================================================

const fs = require("fs");
const xgboost = require("ml-xgboost");

class VolatilityPredictor {
  constructor() {
    this.booster = null;
    this.trained = false;
    this.trainingMetrics = null;
  }

  // ==========================================================================
  // 📌 Feature Engineering
  // ==========================================================================
  prepareFeatures(data, i) {
    const current = data[i];
    const prev = data[i - 1] || current;

    // ✅ FIXED: Proper validation (check for null/undefined, not falsy)
    if (
      current.close == null || current.high == null || current.low == null ||
      current.atr == null || current.rsi == null || 
      current.volume == null || current.avgVolume == null || current.adx == null
    ) {
      return null;
    }

    // ✅ FIXED: Additional NaN/Infinity checks
    const requiredValues = [
      current.close, current.high, current.low, current.atr, 
      current.rsi, current.volume, current.avgVolume, current.adx
    ];
    
    if (requiredValues.some(v => !Number.isFinite(v))) {
      return null;
    }

    const features = [
      current.atr,                                                    // Current ATR
      prev.atr > 0 ? (current.atr - prev.atr) / prev.atr : 0,       // ATR change
      (current.high - current.low) / current.close,                  // Price range
      prev.rsi > 0 ? (current.rsi - prev.rsi) / prev.rsi : 0,       // RSI velocity
      current.avgVolume > 0 ? current.volume / current.avgVolume : 1, // Volume spike
      this.calculateRecentSwings(data, i, 10),                       // Recent swings
      current.adx                                                     // Trend strength
    ];

    // ✅ Ensure all features are valid numbers
    return features.map(v => Number.isFinite(v) ? v : 0);
  }

  calculateRecentSwings(data, index, lookback = 10) {
    let swings = 0;
    const start = Math.max(1, index - lookback);
    
    for (let j = start; j < index; j++) {
      const prev = data[j - 1];
      const curr = data[j];
      
      if (!prev || !curr || !prev.close || !curr.close) continue;
      
      const change = Math.abs(curr.close - prev.close) / prev.close;
      if (change > 0.005) swings++; // 0.5% move = swing
    }
    
    return swings;
  }

  calculateFutureVolatility(data, i, horizon = 5) {
    const end = Math.min(i + 1 + horizon, data.length);
    const futureSlice = data.slice(i + 1, end);
    
    if (futureSlice.length === 0) return null;

    const atrValues = futureSlice
      .map(c => c.atr)
      .filter(v => v != null && Number.isFinite(v) && v > 0);

    if (atrValues.length === 0) return null;

    return atrValues.reduce((sum, val) => sum + val, 0) / atrValues.length;
  }

  // ==========================================================================
  // 📌 Training
  // ==========================================================================
  async trainModel(historicalData) {
    const features = [];
    const targets = [];

    console.log(`📊 Preparing training dataset from ${historicalData.length} candles...`);

    // ✅ Need more lookback for features (20) and horizon for target (5)
    for (let i = 20; i < historicalData.length - 5; i++) {
      const f = this.prepareFeatures(historicalData, i);
      const target = this.calculateFutureVolatility(historicalData, i, 5);

      if (f && target && target > 0) {
        features.push(f);
        targets.push(target);
      }
    }

    console.log(`✅ Prepared ${features.length} samples for training`);

    if (features.length < 300) {
      throw new Error(
        `❌ Not enough valid samples to train volatility model (need 300+, got ${features.length})`
      );
    }

    // Train/test split
    const split = Math.floor(features.length * 0.8);
    const X_train = features.slice(0, split);
    const y_train = targets.slice(0, split);
    const X_test = features.slice(split);
    const y_test = targets.slice(split);

    console.log(`📊 Train/Test Split: ${X_train.length}/${X_test.length}`);
    console.log("⚡ Training XGBoost regressor...");

    // ✅ Create DMatrix objects
    const dtrain = new xgboost.DMatrix(X_train, y_train);
    const dtest = new xgboost.DMatrix(X_test, y_test);

    // ✅ Train with ml-xgboost
    const params = {
      objective: "reg:squarederror",
      max_depth: 6,
      eta: 0.1,
      subsample: 0.8,
      colsample_bytree: 0.8,
      silent: 0
    };

    this.booster = xgboost.train(
      params,
      dtrain,
      100, // num_boost_round
      [[dtest, "validation"]]
    );

    // ✅ Evaluate test MAE
    const predictions = this.booster.predict(dtest);
    const mae = predictions.reduce((sum, pred, idx) => {
      return sum + Math.abs(pred - y_test[idx]);
    }, 0) / predictions.length;

    this.trainingMetrics = {
      samples: features.length,
      trainSize: X_train.length,
      testSize: X_test.length,
      meanAbsoluteError: mae,
      avgTargetValue: y_test.reduce((a, b) => a + b, 0) / y_test.length
    };

    this.trained = true;

    console.log("✅ Training completed!");
    console.log(`📊 Test Set MAE: ${mae.toFixed(6)}`);
    console.log(`📊 Avg Target Value: ${this.trainingMetrics.avgTargetValue.toFixed(6)}`);

    return this.trainingMetrics;
  }

  // ==========================================================================
  // 📌 Prediction
  // ==========================================================================
  predict(currentData) {
    if (!this.trained || !this.booster) {
      throw new Error("❌ Model not trained or loaded");
    }

    // ✅ Handle both array and single object input
    const dataArray = Array.isArray(currentData) ? currentData : [currentData];
    const lastIndex = dataArray.length - 1;

    const f = this.prepareFeatures(dataArray, lastIndex);
    
    if (!f) {
      throw new Error("❌ Invalid input data for prediction");
    }

    // ✅ Predict using ml-xgboost
    const dtest = new xgboost.DMatrix([f]);
    const predictions = this.booster.predict(dtest);
    const predictedVolatility = predictions[0];

    const currentVolatility = dataArray[lastIndex].atr || 0;
    const percentChange = currentVolatility > 0
      ? ((predictedVolatility - currentVolatility) / currentVolatility) * 100
      : 0;

    return {
      predictedVolatility: Number(predictedVolatility.toFixed(6)),
      volatilityLevel: this.categorizeVolatility(predictedVolatility, dataArray[lastIndex]),
      riskAdjustment: this.calculateRiskAdjustment(predictedVolatility),
      confidence: Math.max(0, Math.min(1, 1 - Math.abs(percentChange) / 100)),
      currentVolatility: Number(currentVolatility.toFixed(6)),
      percentChange: Number(percentChange.toFixed(2)),
      recommendation: predictedVolatility > currentVolatility * 1.2
        ? "REDUCE_POSITION"
        : "NORMAL_POSITION"
    };
  }

  categorizeVolatility(predictedVolatility, lastCandle) {
    const close = lastCandle.close || 1;
    const ratio = predictedVolatility / close;

    if (ratio < 0.005) return "LOW";      // < 0.5%
    if (ratio < 0.01) return "MEDIUM";    // 0.5% - 1.0%
    return "HIGH";                         // > 1.0%
  }

  calculateRiskAdjustment(volatility) {
    if (volatility <= 0) return 1.0;
    if (volatility < 0.005) return 2.0;   // Low volatility → increase position
    if (volatility < 0.01) return 1.2;    // Medium → slightly increase
    if (volatility < 0.02) return 0.8;    // High → reduce
    return 0.5;                            // Very high → cut position in half
  }

  // ==========================================================================
  // 📌 Save / Load
  // ==========================================================================
  async saveModel(filepath = "./saved-models/volatility-model.json") {
    if (!this.booster) {
      throw new Error("❌ No model to save");
    }

    const modelData = {
      boosterJSON: this.booster.save(),
      trainedAt: new Date().toISOString(),
      trainingMetrics: this.trainingMetrics
    };

    await fs.promises.mkdir("./saved-models", { recursive: true });
    await fs.promises.writeFile(filepath, JSON.stringify(modelData, null, 2));
    
    console.log(`💾 Volatility model saved to ${filepath}`);
  }

  async loadModel(filepath = "./saved-models/volatility-model.json") {
    if (!fs.existsSync(filepath)) {
      throw new Error(`❌ Saved model not found at ${filepath}`);
    }

    const raw = await fs.promises.readFile(filepath, "utf8");
    const modelData = JSON.parse(raw);

    this.booster = xgboost.Booster.load(modelData.boosterJSON);
    this.trainingMetrics = modelData.trainingMetrics || null;
    this.trained = true;

    console.log(`📂 Volatility model loaded from ${filepath}`);
    if (this.trainingMetrics) {
      console.log(`   Trained at: ${modelData.trainedAt}`);
      console.log(`   Test MAE: ${this.trainingMetrics.meanAbsoluteError.toFixed(6)}`);
    }
  }
}

module.exports = VolatilityPredictor;
