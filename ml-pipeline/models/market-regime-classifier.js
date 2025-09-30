// ============================================================================
// 📊 Market Regime Classifier (Phase 2 - Step 1.4)
// Industry Standard Statistical Approach (ADX, BB, ATR, EMA)
// ============================================================================

class MarketRegimeClassifier {
  constructor() {}

  /**
   * 📌 Main classification entry point
   */
  classifyRegime(candles, indicators) {
    if (!candles || candles.length < 50) {
      throw new Error("❌ Not enough candles for regime classification");
    }

    const lastIdx = candles.length - 1;

    // Extract latest values
    const price = candles[lastIdx].close;
    const adx = indicators.adx?.[lastIdx] || 0;
    const atr = indicators.atr?.[lastIdx] || 0;
    const bbWidth = this.calculateBBWidth(indicators, lastIdx);
    const ema20 = indicators.ema20?.[lastIdx] || price;
    const ema50 = indicators.ema50?.[lastIdx] || price;
    const ema200 = indicators.ema200?.[lastIdx] || price;
    const volume = candles[lastIdx].volume || 0;
    const avgVolume =
      lastIdx >= 20
        ? candles.slice(lastIdx - 20, lastIdx).reduce((s, c) => s + (c.volume || 0), 0) / 20
        : volume;

    // Classification variables
    let regime = "UNKNOWN";
    let subtype = null;
    let confidence = 0.5;
    let strategy = "NONE";
    let riskLevel = "LOW";

    // --- TRENDING ---
    if (adx > 25 && ema20 > ema50 && ema50 > ema200) {
      regime = "TRENDING";
      subtype = price > ema20 ? "UPTREND" : "DOWNTREND";
      confidence = Math.min(1, adx / 50);
      strategy = "FOLLOW_TREND";
      riskLevel = "MEDIUM";
    }
    // --- RANGING ---
    else if (adx < 20 && bbWidth < 0.02) {
      regime = "RANGING";
      subtype = "CONSOLIDATION";
      confidence = 0.7;
      strategy = "MEAN_REVERSION";
      riskLevel = "LOW";
    }
    // --- BREAKOUT ---
    else if (volume > avgVolume * 1.5 && adx > 20 && price > ema20) {
      regime = "BREAKOUT";
      subtype = "BULLISH_BREAKOUT";
      confidence = 0.8;
      strategy = "MOMENTUM_PLAY";
      riskLevel = "HIGH";
    } else if (volume > avgVolume * 1.5 && adx > 20 && price < ema20) {
      regime = "BREAKOUT";
      subtype = "BEARISH_BREAKOUT";
      confidence = 0.8;
      strategy = "MOMENTUM_PLAY";
      riskLevel = "HIGH";
    }
    // --- VOLATILE ---
    else if (atr > this.averageATR(indicators, lastIdx) * 1.5) {
      regime = "VOLATILE";
      subtype = "CHAOTIC";
      confidence = 0.75;
      strategy = "REDUCE_POSITION";
      riskLevel = "VERY_HIGH";
    }

    return {
      regime,
      subtype,
      confidence,
      characteristics: {
        trendStrength: adx,
        volatility: atr,
        bbWidth,
        emaAlignment: this.checkEMAAlignment(ema20, ema50, ema200),
      },
      strategyRecommendation: strategy,
      riskLevel,
      metrics: {
        adx,
        atr,
        bbWidth,
        ema20,
        ema50,
        ema200,
        volume,
        avgVolume,
      },
    };
  }

  /**
   * 📌 Calculate Bollinger Band Width
   */
  calculateBBWidth(indicators, idx) {
    if (!indicators.bbUpper || !indicators.bbLower) return 0;
    const upper = indicators.bbUpper[idx];
    const lower = indicators.bbLower[idx];
    const mid = indicators.ema20?.[idx] || 1;
    if (!upper || !lower || !mid) return 0;
    return (upper - lower) / mid;
  }

  /**
   * 📌 Average ATR (20-period)
   */
  averageATR(indicators, idx) {
    if (!indicators.atr) return 1;
    const start = Math.max(0, idx - 20);
    const slice = indicators.atr.slice(start, idx + 1).filter((x) => x !== null && x !== undefined);
    if (!slice.length) return 1;
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  }

  /**
   * 📌 Check EMA Alignment
   */
  checkEMAAlignment(ema20, ema50, ema200) {
    if (ema20 > ema50 && ema50 > ema200) return "BULLISH";
    if (ema20 < ema50 && ema50 < ema200) return "BEARISH";
    return "MIXED";
  }
}

module.exports = MarketRegimeClassifier;
