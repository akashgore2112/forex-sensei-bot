// ml-pipeline/feature-engineering/feature-generator.js
const math = require("mathjs");

class FeatureGenerator {
  constructor() {}

  // Encode categorical values into numbers
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

  // --- Custom Statistical Helpers ---
  calculateSkewness(values) {
    if (!values || values.length < 3) return 0;
    const mean = math.mean(values);
    const std = math.std(values);
    if (std === 0) return 0;
    const n = values.length;
    const skew =
      (1 / n) *
      values.reduce((acc, v) => acc + Math.pow((v - mean) / std, 3), 0);
    return skew;
  }

  calculateKurtosis(values) {
    if (!values || values.length < 4) return 0;
    const mean = math.mean(values);
    const std = math.std(values);
    if (std === 0) return 0;
    const n = values.length;
    const kurt =
      (1 / n) *
      values.reduce((acc, v) => acc + Math.pow((v - mean) / std, 4), 0);
    return kurt;
  }

  generateAllFeatures(candles, indicators) {
    const features = {};
    try {
      // === Trend Features ===
      features.ema_trend_strength = indicators.ema_trend_strength || 0;
      features.price_above_ema20 = indicators.price_above_ema20 ? 1 : 0;
      features.price_above_ema50 = indicators.price_above_ema50 ? 1 : 0;
      features.ema_alignment_score = indicators.ema_alignment_score || 0;
      features.ema20_slope = indicators.ema20_slope || 0;
      features.ema50_slope = indicators.ema50_slope || 0;

      // === RSI & Momentum ===
      features.trend_consistency = indicators.trend_consistency || 0;
      features.rsi_normalized = indicators.rsi_normalized || 0;
      features.rsi_velocity = indicators.rsi_velocity || 0;
      features.macd_above_signal = indicators.macd_above_signal ? 1 : 0;
      features.macd_momentum = indicators.macd_momentum || 0;
      features.momentum_score = indicators.momentum_score || 0;
      features.momentum_divergence = indicators.momentum_divergence || 0;

      // === Volatility ===
      features.atr_normalized = indicators.atr_normalized || 0;
      features.volatility_spike = indicators.volatility_spike || 0;
      features.bb_squeeze = indicators.bb_squeeze ? 1 : 0;
      features.bb_width_percentile = indicators.bb_width_percentile || 0;
      features.volatility_regime = this.encodeCategorical(
        indicators.volatility_regime,
        "regime"
      );

      // === Volume ===
      features.volume_ratio = indicators.volume_ratio || 0;
      features.volume_trend = this.encodeCategorical(
        indicators.volume_trend,
        "trend"
      );
      features.volume_spike = indicators.volume_spike || 0;
      features.volume_confirmation = indicators.volume_confirmation ? 1 : 0;

      // === Support/Resistance ===
      features.distance_to_support = indicators.distance_to_support || 0;
      features.distance_to_resistance = indicators.distance_to_resistance || 0;
      features.support_strength = this.encodeCategorical(
        indicators.support_strength,
        "strength"
      );
      features.resistance_strength = this.encodeCategorical(
        indicators.resistance_strength,
        "strength"
      );

      // === Statistical Price Features ===
      const closes = candles.map(c => c.close);
      features.price_mean_20 = math.mean(closes.slice(-20));
      features.price_std_20 = math.std(closes.slice(-20));
      features.returns_skew = this.calculateSkewness(closes.slice(-20));
      features.returns_kurtosis = this.calculateKurtosis(closes.slice(-20));

      // === Cross Features ===
      features.trend_momentum_confluence =
        indicators.trend_momentum_confluence || 0;
      features.rsi_macd_agreement = indicators.rsi_macd_agreement || 0;
      features.volume_price_confluence = indicators.volume_price_confluence || 0;
      features.price_rsi_divergence = indicators.price_rsi_divergence || 0;
      features.breakout_potential = indicators.breakout_potential || 0;
    } catch (err) {
      console.error("❌ Feature generation error:", err);
    }

    return features;
  }
}

module.exports = FeatureGenerator;
