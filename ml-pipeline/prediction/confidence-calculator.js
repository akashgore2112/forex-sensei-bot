// ============================================================================
// 📊 Confidence Calculator (Phase 2 - Step 9.2)
// Role: Calculate overall ensemble confidence score for trading signals
// Author: Forex ML Pipeline
// ============================================================================

class ConfidenceCalculator {
  constructor(weights = {}) {
    this.weights = {
      agreement: weights.agreement ?? 0.4,
      avgConfidence: weights.avgConfidence ?? 0.3,
      regimeMatch: weights.regimeMatch ?? 0.2,
      volatility: weights.volatility ?? 0.1,
    };
  }

  // ==========================================================================
  // 🟢 Agreement Score (how many models agree on signal/direction)
  // ==========================================================================
  calculateAgreement(models) {
    const signals = models
      .map(m => m?.signal || m?.direction || null)
      .filter(Boolean);

    if (signals.length === 0) return 0;

    const counts = signals.reduce((acc, sig) => {
      acc[sig] = (acc[sig] || 0) + 1;
      return acc;
    }, {});

    const maxCount = Math.max(...Object.values(counts));
    const agreementRatio = maxCount / signals.length;

    if (agreementRatio === 1) return 1.0; // All agree
    if (agreementRatio >= 0.75) return 0.75; // 3 of 4 agree
    if (agreementRatio >= 0.5) return 0.5; // 2 of 4
    return 0.0; // No agreement
  }

  // ==========================================================================
  // 🟡 Average Confidence Score (from each model)
  // ==========================================================================
  calculateAvgConfidence(models) {
    const confidences = models
      .map(m => m?.confidence)
      .filter(c => typeof c === "number" && c >= 0);

    if (confidences.length === 0) return 0;

    const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    return avg;
  }

  // ==========================================================================
  // 🔵 Regime Match Score (does regime align with final signal?)
  // ==========================================================================
  calculateRegimeMatch(regimePrediction, finalSignal) {
    if (!regimePrediction || !finalSignal) return 0.5; // neutral

    const { classification, confidence } = regimePrediction;

    if (classification === "TRENDING" && (finalSignal === "BUY" || finalSignal === "SELL")) {
      return confidence; // strong match if trending and directional signal
    }

    if (classification === "RANGING" && finalSignal === "HOLD") {
      return confidence; // strong match if ranging and HOLD
    }

    return 0.25; // weak alignment
  }

  // ==========================================================================
  // 🔴 Volatility Alignment Score (does volatility support trade setup?)
  // ==========================================================================
  calculateVolatilityAlignment(volatilityPrediction, finalSignal) {
    if (!volatilityPrediction) return 0.5; // neutral

    const { volatilityLevel } = volatilityPrediction;

    if (finalSignal === "HOLD") return 0.75; // hold is safer in high vol

    switch (volatilityLevel) {
      case "LOW":
        return 0.9; // stable market → more confidence
      case "MEDIUM":
        return 0.7; // normal
      case "HIGH":
        return 0.4; // risky → reduce confidence
      default:
        return 0.5;
    }
  }

  // ==========================================================================
  // 🔗 Main Confidence Calculation
  // ==========================================================================
  calculateConfidence(models, regimePrediction, volatilityPrediction, finalSignal) {
    const agreementScore = this.calculateAgreement(models);
    const avgConfidence = this.calculateAvgConfidence(models);
    const regimeMatch = this.calculateRegimeMatch(regimePrediction, finalSignal);
    const volatilityAlignment = this.calculateVolatilityAlignment(volatilityPrediction, finalSignal);

    const ensembleConfidence =
      (agreementScore * this.weights.agreement) +
      (avgConfidence * this.weights.avgConfidence) +
      (regimeMatch * this.weights.regimeMatch) +
      (volatilityAlignment * this.weights.volatility);

    return {
      confidence: Math.min(1, Math.max(0, ensembleConfidence)),
      breakdown: {
        agreementScore,
        avgConfidence,
        regimeMatch,
        volatilityAlignment,
        weights: this.weights,
      },
    };
  }
}

module.exports = ConfidenceCalculator;
