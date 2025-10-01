// ai-validation/prompt-builder.js
class PromptBuilder {
  buildValidationPrompt({ ensemble, mtfa, context }) {
    return `
# TRADING SIGNAL VALIDATION REQUEST

## ENSEMBLE PREDICTION
Signal: ${ensemble.signal}
Confidence: ${((ensemble.confidence || 0) * 100).toFixed(1)}%
Agreement: ${ensemble.agreement?.modelsAgree || 0}/${ensemble.agreement?.totalModels || 4} models

### Model Predictions:

1. LSTM Price Predictor:
   - Direction: ${ensemble.models?.lstm?.direction || "N/A"}
   - Confidence: ${((ensemble.models?.lstm?.confidence || 0) * 100).toFixed(1)}%
   - Predicted Prices: ${ensemble.models?.lstm?.predictedPrices?.map(p => p.toFixed(5)).join(", ") || "N/A"}

2. Random Forest Classifier:
   - Signal: ${ensemble.models?.randomForest?.signal || "N/A"}
   - Confidence: ${((ensemble.models?.randomForest?.confidence || 0) * 100).toFixed(1)}%
   - Probabilities: BUY ${((ensemble.models?.randomForest?.probabilities?.BUY || 0) * 100).toFixed(1)}%, SELL ${((ensemble.models?.randomForest?.probabilities?.SELL || 0) * 100).toFixed(1)}%, HOLD ${((ensemble.models?.randomForest?.probabilities?.HOLD || 0) * 100).toFixed(1)}%

3. Volatility Predictor:
   - Level: ${ensemble.models?.volatility?.volatilityLevel || "N/A"}
   - Predicted Volatility: ${ensemble.models?.volatility?.predictedVolatility?.toFixed(6) || "N/A"}
   - Risk Adjustment: ${ensemble.models?.volatility?.riskAdjustment?.toFixed(2) || "N/A"}x

4. Market Regime Classifier:
   - Classification: ${ensemble.models?.regime?.regime || "N/A"}
   - Subtype: ${ensemble.models?.regime?.subtype || "N/A"}
   - Strategy: ${ensemble.models?.regime?.strategyRecommendation || "N/A"}
   - Confidence: ${((ensemble.models?.regime?.confidence || 0) * 100).toFixed(1)}%

---

## MULTI-TIMEFRAME TECHNICAL ANALYSIS
- Daily Bias: ${mtfa.biases?.daily || "N/A"}
- Weekly Bias: ${mtfa.biases?.weekly || "N/A"}
- Monthly Bias: ${mtfa.biases?.monthly || "N/A"}
- Overall Bias: ${mtfa.overallBias || "N/A"}
- MTFA Confidence: ${mtfa.confidence || 0}%

### Current Technical Levels:
- Price: ${mtfa.dailyCandles?.[mtfa.dailyCandles.length - 1]?.close?.toFixed(5) || "N/A"}
- EMA20: ${this.getLatestIndicator(mtfa.daily?.indicators?.ema20)}
- EMA50: ${this.getLatestIndicator(mtfa.daily?.indicators?.ema50)}
- RSI(14): ${this.getLatestIndicator(mtfa.daily?.indicators?.rsi14)}
- ADX(14): ${this.getLatestIndicator(mtfa.daily?.indicators?.adx)}

${context ? this.formatMarketContext(context) : ''}

---

## YOUR TASK
Validate this **${ensemble.signal}** signal by:
1. **Confluence Check**: Do technical + ML signals align?
2. **Risk Assessment**: What risks exist?
3. **Quality Rating**: Rate 0-100 based on setup quality
4. **Validation Decision**: APPROVE (clear), REJECT (bad), CAUTION (marginal)
5. **Recommendations**: Specific trading advice

Respond ONLY in JSON with this exact structure (no additional text):
{
  "validation": "APPROVE",
  "aiConfidence": 0.82,
  "reasoning": "detailed explanation",
  "risks": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"],
  "quality": 82,
  "recommendations": "actionable trading advice"
}
`;
  }

  getLatestIndicator(indicatorArray) {
    if (!indicatorArray || indicatorArray.length === 0) return "N/A";
    const latest = indicatorArray[indicatorArray.length - 1];
    
    if (typeof latest === "number") return latest.toFixed(5);
    if (latest?.value !== undefined) return latest.value.toFixed(5);
    return "N/A";
  }

  formatMarketContext(context) {
    if (!context) return "";
    
    const parts = [];
    if (context.priceAction) parts.push(`- Price Action: ${context.priceAction}`);
    if (context.volumeTrend) parts.push(`- Volume Trend: ${context.volumeTrend}`);
    if (context.volatilityState) parts.push(`- Volatility: ${context.volatilityState}`);
    if (context.recentEvents) parts.push(`- Recent Events: ${context.recentEvents.join(", ")}`);
    
    return parts.length > 0 ? `\n## MARKET CONTEXT\n${parts.join("\n")}\n` : "";
  }
}

module.exports = PromptBuilder;
