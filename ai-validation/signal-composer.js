// ai-validation/signal-composer.js
class SignalComposer {
  compose(finalDecision, mtfa, ensemble, aiValidation, marketContext) {
    const timestamp = new Date().toISOString();
    const currentPrice = mtfa.dailyCandles[mtfa.dailyCandles.length - 1].close;

    return {
      pair: "EUR/USD",
      timestamp,
      signal: finalDecision.decision,
      confidence: Number(finalDecision.finalConfidence.toFixed(2)),

      // === ANALYSIS BREAKDOWN ===
      analysis: {
        phase1_technical: this.formatTechnical(mtfa, finalDecision.breakdown.technical),
        phase2_ml: this.formatML(ensemble, finalDecision.breakdown.ml),
        phase3_ai: this.formatAI(aiValidation, finalDecision.breakdown.ai)
      },

      // === MARKET CONTEXT ===
      marketContext: this.formatMarketContext(marketContext),

      // === TRADING PARAMETERS ===
      tradingParams: this.calculateTradingParams(
        finalDecision.decision,
        currentPrice,
        ensemble.models
      ),

      // === REASONING ===
      reasoning: {
        final: finalDecision.reasoning,
        ai: aiValidation.reasoning,
        risks: aiValidation.risks,
        opportunities: aiValidation.opportunities
      },

      // === METADATA ===
      metadata: {
        phaseScores: finalDecision.breakdown,
        mtfaBias: mtfa.overallBias,
        ensembleSignal: ensemble.signal,
        aiValidation: aiValidation.validation,
        quality: aiValidation.quality
      }
    };
  }

  formatTechnical(mtfa, score) {
    return {
      score: Number(score.toFixed(2)),
      biases: mtfa.biases,
      overallBias: mtfa.overallBias,
      confidence: mtfa.confidence
    };
  }

  formatML(ensemble, score) {
    return {
      score: Number(score.toFixed(2)),
      signal: ensemble.signal,
      confidence: ensemble.confidence,
      modelAgreement: `${ensemble.agreement.modelsAgree}/${ensemble.agreement.totalModels}`,
      predictions: {
        lstm: ensemble.models.lstm.direction,
        randomForest: ensemble.models.randomForest.signal,
        volatility: ensemble.models.volatility.volatilityLevel,
        regime: ensemble.models.regime.regime
      }
    };
  }

  formatAI(aiValidation, score) {
    return {
      score: Number(score.toFixed(2)),
      validation: aiValidation.validation,
      confidence: aiValidation.aiConfidence,
      quality: aiValidation.quality,
      recommendations: aiValidation.recommendations
    };
  }

  formatMarketContext(context) {
    return {
      priceAction: context.priceAction.shortTerm,
      volumeTrend: context.volumeTrend,
      marketMood: context.marketMood,
      recentEvents: context.recentEvents.slice(0, 3)
    };
  }

  calculateTradingParams(signal, currentPrice, models) {
    if (signal === "NO_SIGNAL" || signal === "HOLD") {
      return {
        entry: null,
        target: null,
        stopLoss: null,
        riskReward: null,
        positionSize: null
      };
    }

    const atr = models.volatility.currentVolatility || 0.0005;
    const riskAdjustment = models.volatility.riskAdjustment || 1.0;

    let entry = currentPrice;
    let stopLoss, target;

    if (signal === "BUY") {
      stopLoss = entry - atr * 1.5;
      target = entry + atr * 3.5;
    } else {
      stopLoss = entry + atr * 1.5;
      target = entry - atr * 3.5;
    }

    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(target - entry);
    const riskReward = reward / risk;

    return {
      entry: Number(entry.toFixed(5)),
      target: Number(target.toFixed(5)),
      stopLoss: Number(stopLoss.toFixed(5)),
      riskReward: Number(riskReward.toFixed(2)),
      positionSize: Number(riskAdjustment.toFixed(2))
    };
  }
}

module.exports = SignalComposer;
