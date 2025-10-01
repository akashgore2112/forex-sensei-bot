// ml-pipeline/prediction/ensemble-predictor.js
// ============================================================================
// 🤝 Ensemble Predictor (Phase 2 - Step 9.1)
// Combines predictions from LSTM, Random Forest, Volatility, and Regime models
// ============================================================================

const path = require("path");

// Import trained models
const LSTMPricePredictor = require("../models/lstm-predictor");
const SwingSignalClassifier = require("../models/random-forest-classifier");
const VolatilityPredictor = require("../models/volatility-predictor");
const RegimeClassifier = require("../models/market-regime-classifier");

// Import confidence calculator (Step 9.2 - will connect later)
const ConfidenceCalculator = require("./confidence-calculator");

class EnsemblePredictor {
  constructor() {
    this.lstm = null;
    this.randomForest = null;
    this.volatilityPredictor = null;
    this.regimeClassifier = null;

    // Model weights for ensemble
    this.weights = {
      lstm: 0.30,
      randomForest: 0.35,
      volatility: 0.15,
      regime: 0.20
    };

    this.confidenceCalculator = new ConfidenceCalculator();
  }

  // ==========================================================================
  // Load trained models from saved directory
  // ==========================================================================
  async loadModels(modelPath) {
    console.log(`📂 Loading models from: ${modelPath}`);

    this.lstm = new LSTMPricePredictor();
    await this.lstm.loadModel(path.join(modelPath, "lstm-model"));

    this.randomForest = new SwingSignalClassifier();
    await this.randomForest.loadModel(path.join(modelPath, "rf-model.json"));

    this.volatilityPredictor = new VolatilityPredictor();
    await this.volatilityPredictor.loadModel(path.join(modelPath, "volatility-model.json"));

    this.regimeClassifier = new RegimeClassifier();
    await this.regimeClassifier.loadModel(path.join(modelPath, "regime-model.json"));

    console.log("✅ All models loaded successfully!\n");
  }

  // ==========================================================================
  // Run predictions from all models
  // ==========================================================================
  async predict(candles, indicators) {
    console.log("🔮 Running ensemble predictions...");

    const recentData = candles.slice(-60); // last 60 candles for LSTM
    const currentData = candles[candles.length - 1]; // latest candle

    // Get individual model outputs
    const lstmPrediction = await this.lstm.predict(recentData);
    const rfPrediction = this.randomForest.predict(currentData);
    const volPrediction = this.volatilityPredictor.predict(candles);
    const regimePrediction = this.regimeClassifier.classifyRegime(candles, indicators);

    console.log("📊 Individual model predictions collected");

    // Combine into ensemble decision
    const ensembleResult = this.combineSignals(lstmPrediction, rfPrediction, volPrediction, regimePrediction);

    // Calculate confidence score (Step 9.2)
    ensembleResult.confidence = this.confidenceCalculator.calculate(
      ensembleResult,
      { lstmPrediction, rfPrediction, volPrediction, regimePrediction }
    );

    return ensembleResult;
  }

  // ==========================================================================
  // Weighted ensemble logic
  // ==========================================================================
  combineSignals(lstm, rf, vol, regime) {
    const weightedScores = {
      BUY: 0,
      SELL: 0,
      HOLD: 0
    };

    // Random Forest directly outputs BUY/SELL/HOLD
    if (rf.signal) {
      weightedScores[rf.signal] += this.weights.randomForest * rf.confidence;
    }

    // LSTM → direction (BULLISH = BUY, BEARISH = SELL)
    if (lstm.direction === "BULLISH") {
      weightedScores.BUY += this.weights.lstm * lstm.confidence;
    } else if (lstm.direction === "BEARISH") {
      weightedScores.SELL += this.weights.lstm * lstm.confidence;
    }

    // Volatility → Adjust HOLD bias if high volatility
    if (vol.volatilityLevel === "HIGH") {
      weightedScores.HOLD += this.weights.volatility * 0.5;
    }

    // Regime → Boost score if aligns with trend
    if (regime.classification === "TRENDING" && rf.signal !== "HOLD") {
      weightedScores[rf.signal] += this.weights.regime * regime.confidence;
    } else if (regime.classification === "RANGING" && rf.signal === "HOLD") {
      weightedScores.HOLD += this.weights.regime * regime.confidence;
    }

    // Final decision
    const finalSignal = Object.entries(weightedScores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];

    return {
      signal: finalSignal,
      scores: weightedScores,
      models: { lstm, rf, vol, regime }
    };
  }
}

module.exports = EnsemblePredictor;
