// ============================================================================
// 📊 Market Regime Classifier (Polished - Expected Output Format)
// Phase 2 - Step 1.4
// Outputs qualitative labels instead of raw numbers
// ============================================================================

class MarketRegimeClassifier {
  classifyRegime(candles, indicators, debug = false) {
    if (!candles || candles.length === 0) {
      throw new Error("❌ No candle data provided");
    }

    const totalCandles = candles.length;
    const warmup = Math.max(200, 20, 14);
    const usableCandles = Math.max(0, totalCandles - warmup);

    if (usableCandles <= 0) {
      throw new Error("❌ Not enough data for regime classification");
    }

    // Latest values
    const latest = {
      close: candles[totalCandles - 1]?.close ?? 0,
      adx: this.safeLast(indicators.adx),
      atr: this.safeLast(indicators.atr),
      atrMean: this.safeMean(indicators.atr),
      ema20: this.safeLast(indicators.ema20),
      ema50: this.safeLast(indicators.ema50),
      ema200: this.safeLast(indicators.ema200),
      bbUpper: this.safeLast(indicators.bollinger?.upper),
      bbLower: this.safeLast(indicators.bollinger?.lower),
    };

    // Derived values
    const bbWidth = latest.bbUpper && latest.bbLower ? latest.bbUpper - latest.bbLower : 0;
    const atrRatio = latest.atrMean > 0 ? latest.atr / latest.atrMean : 1;

    // Classification
    let regime = "UNKNOWN";
    let subtype = "NONE";
    let confidence = 0.5;
    let strategyRecommendation = "NONE";
    let riskLevel = "LOW";

    if (latest.adx > 25 && latest.ema20 > latest.ema50 && latest.ema50 > latest.ema200) {
      regime = "TRENDING";
      subtype = latest.adx > 35 ? "STRONG_UPTREND" : "UPTREND";
      confidence = 0.75 + (latest.adx > 35 ? 0.1 : 0);
      strategyRecommendation = "FOLLOW_TREND";
      riskLevel = "MEDIUM";
    } else if (latest.adx < 20 && bbWidth > 0) {
      regime = "RANGING";
      subtype = bbWidth < latest.close * 0.005 ? "TIGHT_CONSOLIDATION" : "WIDE_RANGE";
      confidence = 0.6;
      strategyRecommendation = "MEAN_REVERSION";
      riskLevel = "LOW";
    } else if (latest.close > latest.bbUpper) {
      regime = "BREAKOUT";
      subtype = "BULLISH_BREAKOUT";
      confidence = 0.75;
      strategyRecommendation = "MOMENTUM";
      riskLevel = "HIGH";
    } else if (latest.close < latest.bbLower) {
      regime = "BREAKOUT";
      subtype = "BEARISH_BREAKOUT";
      confidence = 0.75;
      strategyRecommendation = "MOMENTUM";
      riskLevel = "HIGH";
    } else if (atrRatio > 1.3) {
      regime = "VOLATILE";
      subtype = atrRatio > 2 ? "SPIKE" : "CHAOTIC";
      confidence = 0.65;
      strategyRecommendation = "REDUCE_POSITION";
      riskLevel = "HIGH";
    }

    // Qualitative labels
    const characteristics = {
      trendStrength:
        latest.adx > 30 ? "STRONG" : latest.adx > 20 ? "MODERATE" : "WEAK",
      volatility:
        atrRatio > 2 ? "HIGH" : atrRatio > 1.3 ? "MEDIUM" : "LOW",
      momentum:
        latest.ema20 > latest.ema50 && latest.ema50 > latest.ema200
          ? "POSITIVE"
          : latest.ema20 < latest.ema50 && latest.ema50 < latest.ema200
          ? "NEGATIVE"
          : "MIXED",
      rangeQuality:
        bbWidth > latest.close * 0.02
          ? "EXPANDING"
          : bbWidth < latest.close * 0.005
          ? "CONTRACTING"
          : "STABLE",
    };

    return {
      regime,
      subtype,
      confidence: Number(confidence.toFixed(2)),
      characteristics,
      strategyRecommendation,
      riskLevel,
      metrics: {
        adx: latest.adx,
        atr: latest.atr,
        bbWidthPercentile: bbWidth / latest.close,
        priceVsEMA:
          latest.close > latest.ema20
            ? "ABOVE"
            : latest.close < latest.ema20
            ? "BELOW"
            : "NEUTRAL",
      },
    };
  }

  safeLast(arr) {
    return Array.isArray(arr) && arr.length ? arr[arr.length - 1] : 0;
  }

  safeMean(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + (b || 0), 0) / arr.length;
  }
}

module.exports = MarketRegimeClassifier;
