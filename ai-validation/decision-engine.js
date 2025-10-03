// ai-validation/decision-engine.js
const DecisionConfig = require('./config/decision-config');

class DecisionEngine {
  constructor(config = {}) {
    this.weights = config.weights || DecisionConfig.weights;
    this.thresholds = config.thresholds || DecisionConfig.thresholds;
  }

  /**
   * Make final trading decision
   * @param {Object} mtfa - Phase 1 MTFA result
   * @param {Object} ensemble - Phase 2 ensemble prediction
   * @param {Object} aiValidation - Phase 3 AI validation
   * @param {Object} marketContext - Phase 3 market context
   * @returns {Object} Final decision with confidence breakdown
   */
  makeDecision(mtfa, ensemble, aiValidation, marketContext) {
    console.log("\n🎯 Running Decision Engine...");

    // Step 1: Calculate individual scores
    const scores = {
      technical: this.calculateTechnicalScore(mtfa),
      ml: this.calculateMLScore(ensemble),
      ai: this.calculateAIScore(aiValidation)
    };

    // Step 2: Calculate weighted final confidence
    const finalConfidence = this.calculateFinalConfidence(scores);

    // Step 3: Apply filters and make decision
    const decision = this.applyDecisionLogic(
      ensemble.signal,
      finalConfidence,
      aiValidation,
      scores
    );

    console.log(`   Technical Score: ${(scores.technical * 100).toFixed(1)}%`);
    console.log(`   ML Score: ${(scores.ml * 100).toFixed(1)}%`);
    console.log(`   AI Score: ${(scores.ai * 100).toFixed(1)}%`);
    console.log(`   Final Confidence: ${(finalConfidence * 100).toFixed(1)}%`);
    console.log(`   Decision: ${decision.decision}`);

    return {
      decision: decision.decision,
      finalConfidence,
      reasoning: decision.reasoning,
      breakdown: scores,
      metadata: {
        mtfaBias: mtfa.overallBias,
        ensembleSignal: ensemble.signal,
        aiValidation: aiValidation.validation
      }
    };
  }

  /** Calculate technical analysis score (Phase 1) */
  calculateTechnicalScore(mtfa) {
    const mtfaConfidence = mtfa.confidence / 100;
    const fullAlignment =
      mtfa.biases.daily === mtfa.biases.weekly &&
      mtfa.biases.weekly === mtfa.biases.monthly;

    const alignmentBonus = fullAlignment ? 0.1 : 0;
    return Math.min(1, mtfaConfidence + alignmentBonus);
  }

  /** Calculate ML score (Phase 2) */
  calculateMLScore(ensemble) {
    let score = ensemble.confidence;
    const agreementRatio =
      ensemble.agreement.modelsAgree / ensemble.agreement.totalModels;

    if (agreementRatio < 0.5) {
      score *= 0.8; // 20% penalty
    }

    if (
      ensemble.models.regime.regime === "TRENDING" &&
      (ensemble.signal === "BUY" || ensemble.signal === "SELL")
    ) {
      score = Math.min(1, score * 1.1); // bonus
    }

    return score;
  }

  /** Calculate AI validation score (Phase 3) */
  calculateAIScore(aiValidation) {
    let score = aiValidation.aiConfidence;

    if (aiValidation.validation === "APPROVE") {
      score = Math.min(1, score * 1.15); // 15% bonus
    } else if (aiValidation.validation === "REJECT") {
      score *= 0.5; // 50% penalty
    } else if (aiValidation.validation === "CAUTION") {
      score *= 0.85; // 15% penalty
    }

    return score;
  }

  /** Weighted final confidence */
  calculateFinalConfidence(scores) {
    return (
      scores.technical * this.weights.technical +
      scores.ml * this.weights.ml +
      scores.ai * this.weights.ai
    );
  }

  /** Apply filters + final decision */
  applyDecisionLogic(signal, finalConfidence, aiValidation, scores) {
    // ✅ NEW: Reject low-confidence ensemble predictions
    
    if (aiValidation.validation === "REJECT") {
      return {
        decision: "NO_SIGNAL",
        reasoning: `AI rejected signal: ${aiValidation.reasoning}`
      };
    }

    if (finalConfidence < this.thresholds.minimumConfidence) {
      return {
        decision: "NO_SIGNAL",
        reasoning: `Confidence too low: ${(finalConfidence * 100).toFixed(
          1
        )}% < ${(this.thresholds.minimumConfidence * 100).toFixed(1)}% required`
      };
    }

    if (scores.technical > 0.7 && scores.ml < 0.4) {
      return {
        decision: "NO_SIGNAL",
        reasoning: "Strong technical-ML conflict detected"
      };
    }

    if (
      aiValidation.validation === "CAUTION" &&
      finalConfidence < 0.7
    ) {
      return {
        decision: "NO_SIGNAL",
        reasoning: "AI caution + insufficient confidence"
      };
    }

    return {
      decision: signal,
      reasoning: `Signal approved with ${(finalConfidence * 100).toFixed(
        1
      )}% confidence`
    };
  }
}

module.exports = DecisionEngine;
