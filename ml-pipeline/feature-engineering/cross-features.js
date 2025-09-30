// ml-pipeline/feature-engineering/cross-features.js
// ============================================================================
// 🤝 Cross-Features Module (Phase 2 - Step 7.3) - FIXED
// Goal: Generate combined indicator features from computed features
// ============================================================================

class CrossFeatures {
  constructor() {}

  /**
   * Generate all cross features from base features
   * @param {Object} features - Base features from feature-generator
   * @param {Array} candles - Raw candles for pattern detection
   * @returns {Object} Cross features
   */
  generateAllCrossFeatures(features, candles) {
    const crossFeatures = {};

    Object.assign(crossFeatures, this.generateConfluence(features));
    Object.assign(crossFeatures, this.generateDivergences(features, candles));
    Object.assign(crossFeatures, this.generatePatterns(candles));

    return crossFeatures;
  }

  // ==========================================================================
  // Confluence Features
  // ==========================================================================
  generateConfluence(features) {
    const confluence = {};

    // Trend + Momentum alignment
    const trendScore = features.ema_alignment_score || 0;
    const momScore = features.momentum_score || 0;
    confluence.trend_momentum_confluence = (trendScore + momScore) / 2;

    // RSI + MACD agreement
    const rsiSignal = features.rsi_normalized > 0.5 ? 1 : -1;
    const macdSignal = features.macd_above_signal ? 1 : -1;
    confluence.rsi_macd_agreement = rsiSignal === macdSignal ? 1 : 0;

    // Volume + Price confirmation
    confluence.volume_price_confluence = 
      features.volume_confirmation && features.price_above_ema20 ? 1 : 0;

    return confluence;
  }

  // ==========================================================================
  // Divergence Features
  // ==========================================================================
  generateDivergences(features, candles) {
    const divergence = {};

    if (candles.length < 5) {
      divergence.price_rsi_divergence = 0;
      divergence.price_macd_divergence = 0;
      return divergence;
    }

    // Price making higher highs but RSI making lower highs = bearish divergence
    const last5 = candles.slice(-5);
    const priceHigherHigh = last5[4].high > last5[2].high && last5[2].high > last5[0].high;
    const rsiLowerHigh = features.rsi_normalized < 0.7; // Simplified

    divergence.price_rsi_divergence = priceHigherHigh && rsiLowerHigh ? 1 : 0;

    // Similar for MACD (simplified)
    divergence.price_macd_divergence = 0;

    return divergence;
  }

  // ==========================================================================
  // Pattern Features
  // ==========================================================================
  generatePatterns(candles) {
    const patterns = {};

    if (candles.length < 3) {
      patterns.higher_highs = 0;
      patterns.higher_lows = 0;
      patterns.breakout_detected = 0;
      patterns.consolidation = 0;
      return patterns;
    }

    const last3 = candles.slice(-3);

    // Higher highs pattern
    patterns.higher_highs = 
      last3[2].high > last3[1].high && last3[1].high > last3[0].high ? 1 : 0;

    // Higher lows pattern
    patterns.higher_lows = 
      last3[2].low > last3[1].low && last3[1].low > last3[0].low ? 1 : 0;

    // Breakout detection
    const prevHigh = Math.max(last3[0].high, last3[1].high);
    patterns.breakout_detected = last3[2].close > prevHigh ? 1 : 0;

    // Consolidation (tight range)
    const ranges = last3.map(c => c.high - c.low);
    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    patterns.consolidation = ranges[2] < avgRange * 0.7 ? 1 : 0;

    return patterns;
  }
}

module.exports = CrossFeatures;
