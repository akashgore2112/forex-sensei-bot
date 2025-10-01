// ============================================================================
// 📝 Phase 3 - Step 10.2: Prompt Builder
// Builds structured prompts for GPT-4 validation
// ============================================================================

class PromptBuilder {
  /**
   * Build validation prompt with ensemble prediction, MTFA, and optional context
   */
  buildValidationPrompt({ ensemble, mtfa, context }) {
    return `
# TRADING SIGNAL VALIDATION REQUEST

## ENSEMBLE PREDICTION
Signal: ${ensemble.signal}
Confidence: ${(ensemble.confidence * 100).toFixed(1)}%
Agreement: ${ensemble.agreement?.modelsAgree || 0}/${ensemble.agreement?.totalModels || 4} models

### Model Predictions:
1. 📈 LSTM Price Predictor:
   - Direction: ${ensemble.models.lstm.direction}
   - Confidence: ${(ensemble.models.lstm.confidence * 100).toFixed(1)}%
   - Predicted Prices: ${ensemble.models.lstm.predictedPrices?.map(p => p.toFixed(5)).join(", ")}

2. 🧠 Random Forest Classifier:
   - Signal: ${ensemble.models.randomForest.signal}
   - Confidence: ${(ensemble.models.randomForest.confidence * 100).toFixed(1)}%
   - Probabilities: BUY ${(ensemble.models.randomForest.probabilities.BUY * 100).toFixed(1)}%, SELL ${(ensemble.models.randomForest.probabilities.SELL * 100).toFixed(1)}%, HOLD ${(ensemble.models.randomForest.probabilities.HOLD * 100).toFixed(1)}%

3. 🌪️ Volatility Predictor:
   - Level: ${ensemble.models.volatility.volatilityLevel}
   - Predicted Volatility: ${ensemble.models.volatility.predictedVolatility?.toFixed(6)}
   - Risk Adjustment: ${ensemble.models.volatility.riskAdjustment?.toFixed(2)}x

4. 📊 Market Regime Classifier:
   - Classification: ${ensemble.models.regime.regime}
   - Subtype: ${ensemble.models.regime.subtype}
   - Strategy: ${ensemble.models.regime.strategyRecommendation}
   - Confidence: ${(ensemble.models.regime.confidence * 100).toFixed(1)}%

---

## MULTI-TIMEFRAME TECHNICAL ANALYSIS (MTFA)
- Daily Bias: ${mtfa.biases.daily}
- Weekly Bias: ${mtfa.biases.weekly}
- Monthly Bias: ${mtfa.biases.monthly}
- Overall Bias: ${mtfa.overallBias}
- MTFA Confidence: ${mtfa.confidence}%

### Current Technical Levels:
- Price: ${mtfa.dailyCandles[mtfa.dailyCandles.length - 1].close.toFixed(5)}
- EMA20: ${this.getLatestIndicator(mtfa.daily.indicators.ema20)}
- EMA50: ${this.getLatestIndicator(mtfa.daily.indicators.ema50)}
- RSI(14): ${this.getLatestIndicator(mtfa.daily.indicators.rsi14)}
- ADX(14): ${this.getLatestIndicator(mtfa.daily.indicators.adx)}

${context ? this.formatMarketContext(context) : ''}

---

## YOUR TASK
Validate this **${ensemble.signal}** signal by:
1. **Confluence Check**: Do technical + ML signals align?
2. **Risk Assessment**: What risks exist?
3. **Quality Rating**: Rate 0–100 based on setup quality
4. **Validation Decision**: APPROVE (clear), REJECT (bad), CAUTION (marginal)
5. **Recommendations**: Specific trading advice

Respond ONLY in JSON with this structure:
{
  "validation": "APPROVE|REJECT|CAUTION",
  "aiConfidence": 0.82,
  "reasoning": "detailed explanation",
  "risks": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"],
  "quality": 82,
  "recommendations": "actionable trading advice"
}
`;
  }

  /**
   * Get the latest value from indicator array safely
   */
  getLatestIndicator(indicatorArray) {
    if (!indicatorArray || indicatorArray.length === 0) return "N/A";
    const latest = indicatorArray[indicatorArray.length - 1];
    return typeof latest === "number"
      ? latest.toFixed(5)
      : latest.value?.toFixed(5) || "N/A";
  }

  /**
   * Format optional market context
   */
  formatMarketContext(context) {
    return `
## MARKET CONTEXT
${context.priceAction ? `- Price Action: ${context.priceAction}` : ""}
${context.volumeTrend ? `- Volume Trend: ${context.volumeTrend}` : ""}
${context.volatilityState ? `- Volatility: ${context.volatilityState}` : ""}
${context.recentEvents ? `- Recent Events: ${context.recentEvents.join(", ")}` : ""}
`;
  }

  /**
   * Separate prompt for detailed risk analysis
   */
  buildRiskAssessmentPrompt(data) {
    return `Analyze risks for this ${data.signal} setup. Consider volatility, news, key levels.`;
  }

  /**
   * Separate prompt for reasoning generation
   */
  buildReasoningPrompt(data) {
    return `Explain why this ${data.signal} signal may succeed or fail. Use MTFA + ML model context.`;
  }
}

module.exports = PromptBuilder;
