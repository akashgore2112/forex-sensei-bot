// ============================================================================
// 🤝 Cross-Features Module (Phase 2 - Step 7.3)
// Goal: Generate combined indicator features (Confluence, Divergence, Patterns)
// ============================================================================

class CrossFeatures {
  constructor() {}

  // === Utility ===
  safe(value, fallback = 0) {
    return (value !== undefined && value !== null && !isNaN(value)) ? value : fallback;
  }

  // === A. Confluence Features ===
  generateConfluence(features) {
    const confluence = {};

    try {
      // Trend + Momentum alignment (EMA + RSI + MACD)
      confluence.trend_momentum_confluence =
        (this.safe(features.ema_trend_strength) +
         this.safe(features.rsi_normalized) +
         this.safe(features.macd_momentum)) / 3;

      // RSI + MACD agreement
      confluence.rsi_macd_agreement =
        (this.safe(features.rsi_normalized) > 0.5 && this.safe(features.macd_momentum) > 0) ? 1 : 0;

      // Volume + Price confirmation
      confluence.volume_price_confluence =
        (this.safe(features.volume_confirmation) && this.safe(features.price_above_ema20)) ? 1 : 0;

    } catch (err) {
      console.error("❌ Confluence feature generation error:", err);
    }

    return confluence;
  }

  // === B. Divergence Features ===
  generateDivergences(features, candles) {
    const divergence = {};

    try {
      // Price vs RSI Divergence
      const recentClose = this.safe(candles.at(-1)?.close);
      const prevClose = this.safe(candles.at(-2)?.close);
      const rsi = this.safe(features.rsi_normalized);
      const prevRsi = this.safe(features.rsi_prev || features.rsi_normalized);

      divergence.price_rsi_divergence =
        (recentClose > prevClose && rsi < prevRsi) ? 1 : 0;

      // Price vs MACD Divergence
      const macd = this.safe(features.macd_momentum);
      const prevMacd = this.safe(features.macd_prev || features.macd_momentum);

      divergence.price_macd_divergence =
        (recentClose > prevClose && macd < prevMacd) ? 1 : 0;

      // Volume vs Price Divergence
      const volTrend = this.safe(features.volume_trend);
      divergence.volume_price_divergence =
        (recentClose > prevClose && volTrend < 0) ? 1 : 0;

    } catch (err) {
      console.error("❌ Divergence feature generation error:", err);
    }

    return divergence;
  }

  // === C. Pattern Features ===
  generatePatterns(candles) {
    const patterns = {};

    try {
      if (!candles || candles.length < 3) return patterns;

      const last3 = candles.slice(-3);

      // Higher Highs pattern
      const highs = last3.map(c => c.high);
      patterns.higher_highs =
        (highs[2] > highs[1] && highs[1] > highs[0]) ? 1 : 0;

      // Higher Lows pattern
      const lows = last3.map(c => c.low);
      patterns.higher_lows =
        (lows[2] > lows[1] && lows[1] > lows[0]) ? 1 : 0;

      // Breakout detection (close above previous high)
      const breakout = last3[2].close > Math.max(...highs.slice(0, 2));
      patterns.breakout_detected = breakout ? 1 : 0;

      // Consolidation (low volatility in last 3 candles)
      const ranges = last3.map(c => c.high - c.low);
      const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
      const recentRange = ranges[2];
      patterns.consolidation =
        (recentRange < avgRange * 0.7) ? 1 : 0;

    } catch (err) {
      console.error("❌ Pattern feature generation error:", err);
    }

    return patterns;
  }

  // === Main function: generate all cross features ===
  generateAllCrossFeatures(features, candles) {
    return {
      ...this.generateConfluence(features),
      ...this.generateDivergences(features, candles),
      ...this.generatePatterns(candles),
    };
  }
}

module.exports = CrossFeatures;
