// ml-pipeline/feature-engineering/feature-generator.js

class FeatureGenerator {
  constructor() {}

  encodeCategorical(value, type = "generic") {
    if (value === null || value === undefined) return 0;

    const mappings = {
      strength: { UNKNOWN: 0, WEAK: 1, MEDIUM: 2, STRONG: 3 },
      trend: { UNKNOWN: 0, DECREASING: -1, INCREASING: 1, FLAT: 0 },
      regime: { UNKNOWN: 0, BEARISH: -1, BULLISH: 1, NEUTRAL: 0 },
      generic: { UNKNOWN: 0, YES: 1, NO: 0 }
    };

    const map = mappings[type] || mappings.generic;
    return map[value] !== undefined ? map[value] : 0;
  }

  generateAllFeatures(candles, indicators) {
    const features = {};

    try {
      const lastClose = candles?.[candles.length - 1]?.close || 0;

      // === Trend Features ===
      features.ema_trend_strength = (indicators.adx || 0) / 100; // normalize ADX 0-1
      features.price_above_ema20 = lastClose > (indicators.ema20 || 0) ? 1 : 0;
      features.price_above_ema50 = lastClose > (indicators.ema50 || 0) ? 1 : 0;
      features.ema_alignment_score =
        (lastClose > indicators.ema20 && indicators.ema20 > indicators.ema50) ? 1 : 0;

      // Slopes = difference between last 2 values
      features.ema20_slope = this.calcSlope(indicators.ema20History);
      features.ema50_slope = this.calcSlope(indicators.ema50History);

      // === RSI Features ===
      features.trend_consistency = (indicators.adx || 0) / 100;
      features.rsi_normalized = (indicators.rsi14 || 0) / 100;
      features.rsi_velocity = this.calcSlope(indicators.rsiHistory);

      // === MACD Features ===
      features.macd_above_signal =
        (indicators.macd?.macd || 0) > (indicators.macd?.signal || 0) ? 1 : 0;
      features.macd_momentum = indicators.macd?.histogram || 0;
      features.momentum_score = (features.rsi_normalized + (features.macd_above_signal ? 1 : 0)) / 2;
      features.momentum_divergence = 0; // placeholder

      // === Volatility Features ===
      features.atr_normalized = indicators.atr || 0;
      features.volatility_spike = (indicators.atr || 0) > 2 * (features.atr_normalized || 0) ? 1 : 0;
      features.bb_squeeze =
        (indicators.bollinger?.upper - indicators.bollinger?.lower) /
          indicators.bollinger?.middle < 0.05
          ? 1
          : 0;
      features.bb_width_percentile = (indicators.bollinger?.upper - indicators.bollinger?.lower) || 0;
      features.volatility_regime = 0; // TODO: map properly

      // === Volume Features (if available) ===
      features.volume_ratio = lastClose && candles.length > 1 ? candles[candles.length - 1].volume / 1000 : 0;
      features.volume_trend = 0; // placeholder
      features.volume_spike = 0;
      features.volume_confirmation = 0;

      // === Support/Resistance ===
      const nearestSupport = indicators.supportResistance?.support?.[0];
      const nearestResistance = indicators.supportResistance?.resistance?.[0];
      features.distance_to_support =
        nearestSupport ? Math.abs(lastClose - nearestSupport.level) : 0;
      features.distance_to_resistance =
        nearestResistance ? Math.abs(lastClose - nearestResistance.level) : 0;
      features.support_strength = this.encodeCategorical(nearestSupport?.strength, "strength");
      features.resistance_strength = this.encodeCategorical(nearestResistance?.strength, "strength");

      // === Price Statistics ===
      const closes = candles.slice(-20).map(c => c.close);
      features.price_mean_20 = this.mean(closes);
      features.price_std_20 = this.std(closes);
      features.returns_skew = 0; // TODO
      features.returns_kurtosis = 0; // TODO

      // === Confluence ===
      features.trend_momentum_confluence =
        (features.ema_trend_strength + features.momentum_score) / 2;
      features.rsi_macd_agreement =
        (features.rsi_normalized > 0.5 && features.macd_above_signal) ? 1 : 0;
      features.volume_price_confluence = 0; // TODO

      // === Divergence & Breakouts ===
      features.price_rsi_divergence = 0; // TODO
      features.breakout_potential = features.bb_squeeze ? 1 : 0;

    } catch (err) {
      console.error("❌ Feature generation error:", err);
    }

    return features;
  }

  // ===== Helper Methods =====
  calcSlope(arr) {
    if (!arr || arr.length < 2) return 0;
    return arr[arr.length - 1] - arr[arr.length - 2];
  }

  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  std(arr) {
    if (!arr || arr.length === 0) return 0;
    const m = this.mean(arr);
    return Math.sqrt(arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / arr.length);
  }
}

module.exports = FeatureGenerator;
