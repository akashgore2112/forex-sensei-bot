// ============================================================================
// 📊 Market Regime Classifier (Statistical Approach)
// Phase 2 - Step 1.4
// Added: Warm-up handling + candle usage logging + Debug Mode
// ============================================================================

class MarketRegimeClassifier {
  classifyRegime(candles, indicators, debug = false) {
    if (!candles || candles.length === 0) {
      throw new Error("❌ No candle data provided");
    }

    // --------------------------------------------------
    // 🔹 Calculate usable candles (warm-up drop)
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
    // 🔹 Extract latest indicator values (safe fallback)
    // --------------------------------------------------
    const latest = {
      close: candles[totalCandles - 1]?.close ?? 0,
      volume: candles[totalCandles - 1]?.volume ?? 0,
      avgVolume: this.safeArray(indicators.volumeTrend)
        ?.slice(-20)
        .reduce((a, b) => a + b, 0) / 20 || 0,
      adx: this.safeLast(indicators.adx),
      atr: this.safeLast(indicators.atr),
      ema20: this.safeLast(indicators.ema20),
      ema50: this.safeLast(indicators.ema50),
      ema200: this.safeLast(indicators.ema200),
      bbUpper: this.safeLast(indicators.bollinger?.upper),
      bbLower: this.safeLast(indicators.bollinger?.lower),
    };

    // --------------------------------------------------
    // 🔹 Classification Rules
    // --------------------------------------------------
    let regime = "UNKNOWN";
    let subtype = "NONE";
    let confidence = 0.5;
    let strategyRecommendation = "NONE";
    let riskLevel = "LOW";

    if (latest.adx > 25 && latest.ema20 > latest.ema50 && latest.ema50 > latest.ema200) {
      regime = "TRENDING";
      subtype = latest.close > latest.ema20 ? "UPTREND" : "DOWNTREND";
      confidence = 0.8;
      strategyRecommendation = "FOLLOW_TREND";
      riskLevel = "MEDIUM";
    } else if (latest.adx < 20 && latest.bbUpper && latest.bbLower) {
      const bbWidth = latest.bbUpper - latest.bbLower;
      if (bbWidth < latest.close * 0.01) {
        regime = "RANGING";
        subtype = "CONSOLIDATION";
        confidence = 0.7;
        strategyRecommendation = "MEAN_REVERSION";
        riskLevel = "LOW";
      }
    } else if (latest.close > latest.bbUpper && latest.volume > latest.avgVolume * 1.5) {
      regime = "BREAKOUT";
      subtype = "BULLISH_BREAKOUT";
      confidence = 0.75;
      strategyRecommendation = "MOMENTUM";
      riskLevel = "HIGH";
    } else if (latest.close < latest.bbLower && latest.volume > latest.avgVolume * 1.5) {
      regime = "BREAKOUT";
      subtype = "BEARISH_BREAKOUT";
      confidence = 0.75;
      strategyRecommendation = "MOMENTUM";
      riskLevel = "HIGH";
    } else if (latest.atr > this.safeMean(indicators.atr) * 1.3) {
      regime = "VOLATILE";
      subtype = "CHAOTIC";
      confidence = 0.6;
      strategyRecommendation = "REDUCE_POSITION";
      riskLevel = "HIGH";
    }

    // --------------------------------------------------
    // 🔹 Debug Mode: Print why regime is UNKNOWN
    // --------------------------------------------------
    if (debug && regime === "UNKNOWN") {
      console.log("\n⚠️ DEBUG MODE: Regime classified as UNKNOWN");
      console.log("👉 Latest Indicator Snapshot:");
      console.table(latest);

      console.log("👉 Condition Checks:");
      console.log(`ADX > 25 && EMA alignment? ${latest.adx > 25 && latest.ema20 > latest.ema50 && latest.ema50 > latest.ema200}`);
      console.log(`ADX < 20 && BB squeeze? ${latest.adx < 20 && latest.bbUpper && latest.bbLower}`);
      console.log(`Close > BBUpper && Volume spike? ${latest.close > latest.bbUpper && latest.volume > latest.avgVolume * 1.5}`);
      console.log(`Close < BBLower && Volume spike? ${latest.close < latest.bbLower && latest.volume > latest.avgVolume * 1.5}`);
      console.log(`ATR > 1.3 × mean(ATR)? ${latest.atr > this.safeMean(indicators.atr) * 1.3}`);
    }

    return {
      regime,
      subtype,
      confidence,
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
