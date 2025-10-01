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
      this.lstm = new LSTMPricePredictor();
      const lstmPath = `file://${path.resolve(modelPath, "lstm-model", "model.json")}`;
      await this.lstm.loadModel(lstmPath);

      this.randomForest = new SwingSignalClassifier();
      await this.randomForest.loadModel(path.join(modelPath, "rf-model.json"));

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

    // Merge indicators into ALL candles (LSTM needs last 60 with indicators)
    const candlesWithIndicators = candles.map((candle, i) => ({
      ...candle,
      ema20: indicators.ema20[i] || 0,
      ema50: indicators.ema50[i] || 0,
      ema200: indicators.ema200[i] || 0,
      rsi: indicators.rsi14[i] || 0,
      macd: indicators.macd?.macd[i] || 0,
      atr: indicators.atr[i] || 0,
      adx: indicators.adx[i] || 0,
      prevClose: i > 0 ? candles[i-1].close : candle.close,
      avgVolume: candle.volume || 1
    }));

    const recentData = candlesWithIndicators.slice(-60);
    const currentData = candlesWithIndicators[candlesWithIndicators.length - 1];

    // Get predictions
    console.log("   🔮 LSTM prediction...");
    const lstmPrediction = await this.lstm.predict(recentData);

    console.log("   🌲 Random Forest prediction...");
    const rfPrediction = this.randomForest.predict(currentData);

    console.log("   📊 Volatility prediction...");
    const volPrediction = this.volatilityPredictor.predict(candles);

    console.log("   🎯 Regime classification...");
    const regimePrediction = this.regimeClassifier.classifyRegime(candles, indicators);

    console.log("✅ All predictions collected");

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
