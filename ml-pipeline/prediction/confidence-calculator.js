// ml-pipeline/prediction/confidence-calculator.js
class ConfidenceCalculator {
  constructor(weights = {}) {
    this.weights = {
      agreement: weights.agreement ?? 0.4,
      avgConfidence: weights.avgConfidence ?? 0.3,
      regimeMatch: weights.regimeMatch ?? 0.2,
      volatility: weights.volatility ?? 0.1,
    };
  }

  calculateAgreement(models) {
    const signals = [];
    
    if (models.lstm?.direction === "BULLISH") signals.push("BUY");
    else if (models.lstm?.direction === "BEARISH") signals.push("SELL");
    else signals.push("HOLD");
    
    if (models.rf?.signal) signals.push(models.rf.signal);
    
    if (signals.length === 0) return 0;

    const counts = signals.reduce((acc, sig) => {
      acc[sig] = (acc[sig] || 0) + 1;
      return acc;
    }, {});

    const maxCount = Math.max(...Object.values(counts));
    const agreementRatio = maxCount / signals.length;

    if (agreementRatio === 1) return 1.0;
    if (agreementRatio >= 0.75) return 0.75;
    if (agreementRatio >= 0.5) return 0.5;
    return 0.25;
  }

  calculateAvgConfidence(models) {
    const confidences = [
      models.lstm?.confidence,
      models.rf?.confidence,
      models.vol?.confidence,
      models.regime?.confidence
    ].filter(c => typeof c === "number" && c >= 0);

    if (confidences.length === 0) return 0.5;
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  calculateRegimeMatch(regime, finalSignal) {
    if (!regime || !finalSignal) return 0.5;

    const { classification, confidence } = regime;

    if (classification === "TRENDING" && (finalSignal === "BUY" || finalSignal === "SELL")) {
      return confidence || 0.75;
    }

    if (classification === "RANGING" && finalSignal === "HOLD") {
      return confidence || 0.75;
    }

    return 0.3;
  }

  calculateVolatilityAlignment(vol, finalSignal) {
    if (!vol) return 0.5;

    const level = vol.volatilityLevel || "MEDIUM";

    if (finalSignal === "HOLD") return 0.75;

    switch (level) {
      case "LOW": return 0.9;
      case "MEDIUM": return 0.7;
      case "HIGH": return 0.4;
      default: return 0.5;
    }
  }

  calculate(ensembleResult, models) {
    const agreementScore = this.calculateAgreement(models);
    const avgConfidence = this.calculateAvgConfidence(models);
    const regimeMatch = this.calculateRegimeMatch(models.regimePrediction, ensembleResult.signal);
    const volatilityAlignment = this.calculateVolatilityAlignment(models.volPrediction, ensembleResult.signal);

    const confidence =
      (agreementScore * this.weights.agreement) +
      (avgConfidence * this.weights.avgConfidence) +
      (regimeMatch * this.weights.regimeMatch) +
      (volatilityAlignment * this.weights.volatility);

    return {
      overall: Number(Math.min(1, Math.max(0, confidence)).toFixed(2)),
      breakdown: {
        agreementScore: Number(agreementScore.toFixed(2)),
        avgConfidence: Number(avgConfidence.toFixed(2)),
        regimeMatch: Number(regimeMatch.toFixed(2)),
        volatilityAlignment: Number(volatilityAlignment.toFixed(2))
      }
    };
  }
}

module.exports = ConfidenceCalculator;
