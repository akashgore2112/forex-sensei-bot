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

// Confidence calculator (Step 9.2)
const ConfidenceCalculator = require("./confidence-calculator");

class EnsemblePredictor {
  constructor() {
    this.lstm = null;
    this.randomForest = null;
    this.volatilityPredictor = null;
    this.regimeClassifier = null;

    // Model weights (Step 9 plan)
    this.weights = {
      lstm: 0.30,
      randomForest: 0.35,
      volatility: 0.15,
      regime: 0.20,
    };

    this.confidenceCalculator = new ConfidenceCalculator();
  }

  // ==========================================================================
  // Load trained models (LSTM + RF need saved files, others are statistical)
  // ==========================================================================
  async loadModels(modelPath) {
    console.log(`📂 Loading models from: ${modelPath}`);

    // LSTM (trained ML model)
    this.lstm = new LSTMPricePredictor();
    await this.lstm.loadModel(path.join(modelPath, "lstm-model"));

    // Random Forest (trained ML model)
    this.randomForest = new SwingSignalClassifier();
    await this.randomForest.loadModel(path.join(modelPath, "rf-model.json"));

    // Volatility predictor (statistical → no training required)
    this.volatilityPredictor = new VolatilityPredictor();
    console.log("⚡ VolatilityPredictor ready (no training required)");

    // Regime classifier (statistical → no training required)
    this.regimeClassifier = new RegimeClassifier();
    console.log("⚡ RegimeClassifier ready (no training required)");

    console.log("✅ All models initialized successfully!\n");
  }

  // ==========================================================================
  // Run predictions from all models
  // ==========================================================================
  async predict(candles, indicators) {
    console.log("🔮 Running ensemble predictions...");

    const recentData = candles.slice(-60); // for LSTM
    const currentData = candles[candles.length - 1]; // for RF

    // Step 1: Individual model predictions
    const lstmPrediction = await this.lstm.predict(recentData);
    const rfPrediction = this.randomForest.predict(currentData);
    const volPrediction = this.volatilityPredictor.predict(candles);
    const regimePrediction = this.regimeClassifier.classifyRegime(candles, indicators);

    console.log("📊 Individual model predictions collected");

    // Step 2: Combine into ensemble decision
    const ensembleResult = this.combineSignals(
      lstmPrediction,
      rfPrediction,
      volPrediction,
      regimePrediction
    );

    // Step 3: Calculate confidence score
    ensembleResult.confidence = this.confidenceCalculator.calculate(
      ensembleResult,
      { lstmPrediction, rfPrediction, volPrediction, regimePrediction }
    );

    return ensembleResult;
  }

  // ==========================================================================
  // Weighted ensemble logic (Step 9 plan strictly followed)
  // ==========================================================================
  combineSignals(lstm, rf, vol, regime) {
    const weightedScores = { BUY: 0, SELL: 0, HOLD: 0 };

    // Random Forest → direct BUY/SELL/HOLD
    if (rf.signal) {
      weightedScores[rf.signal] += this.weights.randomForest * rf.confidence;
    }

    // LSTM → direction mapping
    if (lstm.direction === "BULLISH") {
      weightedScores.BUY += this.weights.lstm * lstm.confidence;
    } else if (lstm.direction === "BEARISH") {
      weightedScores.SELL += this.weights.lstm * lstm.confidence;
    }

    // Volatility → high volatility increases HOLD bias
    if (vol.volatilityLevel === "HIGH") {
      weightedScores.HOLD += this.weights.volatility * 0.5;
    }

    // Regime → boost alignment
    if (regime.classification === "TRENDING" && rf.signal !== "HOLD") {
      weightedScores[rf.signal] += this.weights.regime * regime.confidence;
    } else if (regime.classification === "RANGING" && rf.signal === "HOLD") {
      weightedScores.HOLD += this.weights.regime * regime.confidence;
    }

    // Final decision
    const finalSignal = Object.entries(weightedScores).reduce(
      (a, b) => (a[1] > b[1] ? a : b)
    )[0];

    return {
      signal: finalSignal,
      scores: weightedScores,
      models: { lstm, rf, vol, regime },
    };
  }
}

module.exports = EnsemblePredictor;
