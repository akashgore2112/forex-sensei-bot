// ml-pipeline/prediction/ensemble-predictor.js
const path = require("path");

const LSTMPricePredictor = require("../models/lstm-predictor");
const SwingSignalClassifier = require("../models/random-forest-classifier");
const VolatilityPredictor = require("../models/volatility-predictor");
const RegimeClassifier = require("../models/market-regime-classifier");
const ConfidenceCalculator = require("./confidence-calculator");

class EnsemblePredictor {
  constructor() {
    this.lstm = null;
    this.randomForest = null;
    this.volatilityPredictor = null;
    this.regimeClassifier = null;

    this.weights = {
      lstm: 0.30,
      randomForest: 0.35,
      volatility: 0.15,
      regime: 0.20
    };

    this.confidenceCalculator = new ConfidenceCalculator();
  }

  async loadModels(modelPath) {
    console.log(`📂 Loading models from: ${modelPath}`);

    try {
      // LSTM
      this.lstm = new LSTMPricePredictor();
      const lstmPath = `file://${path.resolve(modelPath, "lstm-model", "model.json")}`;
      await this.lstm.loadModel(lstmPath);

      // Random Forest
      this.randomForest = new SwingSignalClassifier();
      await this.randomForest.loadModel(path.join(modelPath, "rf-model.json"));

      // Statistical models (no loading needed)
      this.volatilityPredictor = new VolatilityPredictor();
      this.regimeClassifier = new RegimeClassifier();

      console.log("✅ All models loaded successfully!\n");
    } catch (err) {
      throw new Error(`Failed to load models: ${err.message}`);
    }
  }

  async predict(candles, indicators) {
    console.log("🔮 Running ensemble predictions...");

    if (!candles || candles.length < 100) {
      throw new Error("Need at least 100 candles for prediction");
    }

    const recentData = candles.slice(-60);
    const currentData = candles[candles.length - 1];

    // Add indicators to current candle
    const currentWithIndicators = {
      ...currentData,
      ema20: indicators.ema20[indicators.ema20.length - 1] || 0,
      ema50: indicators.ema50[indicators.ema50.length - 1] || 0,
      ema200: indicators.ema200[indicators.ema200.length - 1] || 0,
      rsi: indicators.rsi14[indicators.rsi14.length - 1] || 0,
      macd: {
        macd: indicators.macd?.macd[indicators.macd.macd.length - 1] || 0,
        signal: indicators.macd?.signal[indicators.macd.signal.length - 1] || 0,
        histogram: indicators.macd?.histogram[indicators.macd.histogram.length - 1] || 0
      },
      atr: indicators.atr[indicators.atr.length - 1] || 0,
      adx: indicators.adx[indicators.adx.length - 1] || 0,
      prevClose: candles[candles.length - 2]?.close || currentData.close,
      avgVolume: currentData.volume || 1
    };

    // Get predictions
    const lstmPrediction = await this.lstm.predict(recentData);
    const rfPrediction = this.randomForest.predict(currentWithIndicators);
    const volPrediction = this.volatilityPredictor.predict(candles);
    const regimePrediction = this.regimeClassifier.classifyRegime(candles, indicators);

    console.log("📊 Individual predictions collected");

    // Combine signals
    const ensembleResult = this.combineSignals(
      lstmPrediction, rfPrediction, volPrediction, regimePrediction
    );

    // Calculate confidence
    const confidenceResult = this.confidenceCalculator.calculate(
      ensembleResult,
      {
        lstm: lstmPrediction,
        rf: rfPrediction,
        vol: volPrediction,
        regime: regimePrediction,
        lstmPrediction,
        rfPrediction,
        volPrediction,
        regimePrediction
      }
    );

    return {
      ...ensembleResult,
      confidence: confidenceResult.overall,
      confidenceBreakdown: confidenceResult.breakdown,
      models: {
        lstm: lstmPrediction,
        randomForest: rfPrediction,
        volatility: volPrediction,
        regime: regimePrediction
      }
    };
  }

  combineSignals(lstm, rf, vol, regime) {
    const weightedScores = { BUY: 0, SELL: 0, HOLD: 0 };

    // Random Forest
    if (rf.signal) {
      weightedScores[rf.signal] += this.weights.randomForest * rf.confidence;
    }

    // LSTM
    if (lstm.direction === "BULLISH") {
      weightedScores.BUY += this.weights.lstm * lstm.confidence;
    } else if (lstm.direction === "BEARISH") {
      weightedScores.SELL += this.weights.lstm * lstm.confidence;
    } else {
      weightedScores.HOLD += this.weights.lstm * lstm.confidence;
    }

    // Volatility penalty
    if (vol.volatilityLevel === "HIGH") {
      weightedScores.HOLD += this.weights.volatility * 0.6;
    }

    // Regime boost
    if (regime.classification === "TRENDING") {
      if (rf.signal === "BUY") weightedScores.BUY += this.weights.regime * regime.confidence;
      if (rf.signal === "SELL") weightedScores.SELL += this.weights.regime * regime.confidence;
    } else if (regime.classification === "RANGING") {
      weightedScores.HOLD += this.weights.regime * regime.confidence;
    }

    const finalSignal = Object.entries(weightedScores)
      .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

    const modelsAgree = this.countAgreement(lstm, rf, finalSignal);

    return {
      signal: finalSignal,
      scores: weightedScores,
      agreement: {
        modelsAgree,
        totalModels: 4
      }
    };
  }

  countAgreement(lstm, rf, finalSignal) {
    let count = 0;
    
    if (rf.signal === finalSignal) count++;
    
    if (finalSignal === "BUY" && lstm.direction === "BULLISH") count++;
    else if (finalSignal === "SELL" && lstm.direction === "BEARISH") count++;
    else if (finalSignal === "HOLD" && lstm.direction === "NEUTRAL") count++;
    
    return count;
  }
}

module.exports = EnsemblePredictor;
