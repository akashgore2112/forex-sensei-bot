// ============================================================================
// 📊 Market Regime Classifier (Statistical Approach)
// Phase 2 - Step 1.4 (Polished)
// Added: Dynamic confidence + subtype expansion + extended metrics
// ============================================================================

class MarketRegimeClassifier {
  classifyRegime(candles, indicators, debug = false) {
    if (!candles || candles.length === 0) {
      throw new Error("❌ No candle data provided");
    }

    // --------------------------------------------------
    // 🔹 Warm-up handling
    // --------------------------------------------------
    const totalCandles = candles.length;
    const warmup = Math.max(200, 20, 14); // EMA200, BBANDS(20), ADX/ATR(14)
    const usableCandles = Math.max(0, totalCandles - warmup);

    console.log("───────────────────────────────────────");
    console.log(`📊 Total candles received: ${totalCandles}`);
    console.log(`⚠️ Warm-up candles dropped: ${warmup}`);
    console.log(`✅ Usable candles for regime detection: ${usableCandles}`);
    console.log("───────────────────────────────────────");

    if (usableCandles <= 0) {
      throw new Error("❌ Not enough data for regime classification");
    }

    // --------------------------------------------------
    // 🔹 Latest Indicator Values
    // --------------------------------------------------
    const latest = {
      close: candles[totalCandles - 1]?.close ?? 0,
      volume: candles[totalCandles - 1]?.volume ?? 0,
      avgVolume: this.safeArray(indicators.volumeTrend)
        ?.slice(-20)
        .reduce((a, b) => a + b, 0) / 20 || 0,
      adx: this.safeLast(indicators.adx),
      atr: this.safeLast(indicators.atr),
      atrMean: this.safeMean(indicators.atr),
      ema20: this.safeLast(indicators.ema20),
      ema50: this.safeLast(indicators.ema50),
      ema200: this.safeLast(indicators.ema200),
      bbUpper: this.safeLast(indicators.bollinger?.upper),
      bbLower: this.safeLast(indicators.bollinger?.lower),
    };

    // --------------------------------------------------
    // 🔹 Classification Logic
    // --------------------------------------------------
    let regime = "UNKNOWN";
    let subtype = "NONE";
    let confidence = 0.5;
    let strategyRecommendation = "NONE";
    let riskLevel = "LOW";

    // 📌 TRENDING detection
    if (latest.adx > 25 && latest.ema20 > latest.ema50 && latest.ema50 > latest.ema200) {
      regime = "TRENDING";
      subtype = latest.adx > 35 ? "STRONG_UPTREND" : "WEAK_UPTREND";
      confidence = latest.adx > 35 ? 0.9 : 0.75;
      strategyRecommendation = "FOLLOW_TREND";
      riskLevel = "MEDIUM";

      if (latest.close < latest.ema20) subtype = "DOWNTREND"; // fallback
    }

    // 📌 RANGING detection
    else if (latest.adx < 20 && latest.bbUpper && latest.bbLower) {
      const bbWidth = latest.bbUpper - latest.bbLower;
      if (bbWidth < latest.close * 0.01) {
        regime = "RANGING";
        subtype = bbWidth < latest.close * 0.005 ? "LOW_VOL_CONSOLIDATION" : "HIGH_VOL_CONSOLIDATION";
        confidence = 0.65 + (0.01 * (20 - latest.adx)); // weaker ADX → higher confidence of ranging
        strategyRecommendation = "MEAN_REVERSION";
        riskLevel = "LOW";
      }
    }

    // 📌 BREAKOUT detection
    else if (latest.close > latest.bbUpper && latest.volume > latest.avgVolume * 1.5) {
      regime = "BREAKOUT";
      subtype = "BULLISH_BREAKOUT";
      confidence = 0.75 + (latest.adx > 30 ? 0.1 : 0); // ADX rising → stronger confidence
      strategyRecommendation = "MOMENTUM";
      riskLevel = "HIGH";
    } else if (latest.close < latest.bbLower && latest.volume > latest.avgVolume * 1.5) {
      regime = "BREAKOUT";
      subtype = "BEARISH_BREAKOUT";
      confidence = 0.75 + (latest.adx > 30 ? 0.1 : 0);
      strategyRecommendation = "MOMENTUM";
      riskLevel = "HIGH";
    }

    // 📌 VOLATILE detection
    else if (latest.atr > latest.atrMean * 1.3) {
      regime = "VOLATILE";
      subtype = latest.atr > latest.atrMean * 2 ? "SPIKE" : "CHAOTIC";
      confidence = latest.atr > latest.atrMean * 2 ? 0.85 : 0.65;
      strategyRecommendation = "REDUCE_POSITION";
      riskLevel = "HIGH";
    }

    // --------------------------------------------------
    // 🔹 Debug Mode
    // --------------------------------------------------
    if (debug && regime === "UNKNOWN") {
      console.log("\n⚠️ DEBUG MODE: Regime classified as UNKNOWN");
      console.log("👉 Latest Indicator Snapshot:");
      console.table(latest);
    }

    return {
      regime,
      subtype,
      confidence: Number(confidence.toFixed(2)),
      characteristics: {
        trendStrength: latest.adx,
        volatility: latest.atr,
        emaAlignment:
          latest.ema20 > latest.ema50 && latest.ema50 > latest.ema200
            ? "BULLISH"
            : latest.ema20 < latest.ema50 && latest.ema50 < latest.ema200
            ? "BEARISH"
            : "MIXED",
        bbWidth: latest.bbUpper && latest.bbLower ? latest.bbUpper - latest.bbLower : 0,
      },
      strategyRecommendation,
      riskLevel,
      metrics: latest,
    };
  }

  // --------------------------------------------------
  // 🔹 Helpers
  // --------------------------------------------------
  safeLast(arr) {
    return Array.isArray(arr) && arr.length ? arr[arr.length - 1] : 0;
  }

  safeArray(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  safeMean(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + (b || 0), 0) / arr.length;
  }
}

module.exports = MarketRegimeClassifier;
