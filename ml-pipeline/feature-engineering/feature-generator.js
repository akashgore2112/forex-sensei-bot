// ml-pipeline/feature-engineering/feature-generator.js

class FeatureGenerator {
  constructor() {}

  // Encode categorical values into numbers for ML compatibility
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
      // === Trend Features ===
      features.ema_trend_strength = indicators.ema_trend_strength || 0;
      features.price_above_ema20 = indicators.price_above_ema20 ? 1 : 0;
      features.price_above_ema50 = indicators.price_above_ema50 ? 1 : 0;
      features.ema_alignment_score = indicators.ema_alignment_score || 0;
      features.ema20_slope = indicators.ema20_slope || 0;
      features.ema50_slope = indicators.ema50_slope || 0;

      // === RSI Features ===
      features.trend_consistency = indicators.trend_consistency || 0;
      features.rsi_normalized = indicators.rsi_normalized || 0;
      features.rsi_velocity = indicators.rsi_velocity || 0;

      // === MACD Features ===
      features.macd_above_signal = indicators.macd_above_signal ? 1 : 0;
      features.macd_momentum = indicators.macd_momentum || 0;
      features.momentum_score = indicators.momentum_score || 0;
      features.momentum_divergence = indicators.momentum_divergence || 0;

      // === Volatility Features ===
      features.atr_normalized = indicators.atr_normalized || 0;
      features.volatility_spike = indicators.volatility_spike || 0;
      features.bb_squeeze = indicators.bb_squeeze ? 1 : 0;
      features.bb_width_percentile = indicators.bb_width_percentile || 0;
      features.volatility_regime = this.encodeCategorical(indicators.volatility_regime, "regime");

      // === Volume Features ===
      features.volume_ratio = indicators.volume_ratio || 0;
      features.volume_trend = this.encodeCategorical(indicators.volume_trend, "trend");
      features.volume_spike = indicators.volume_spike || 0;
      features.volume_confirmation = indicators.volume_confirmation ? 1 : 0;

      // === Support/Resistance Features ===
      features.distance_to_support = indicators.distance_to_support || 0;
      features.distance_to_resistance = indicators.distance_to_resistance || 0;
      features.support_strength = this.encodeCategorical(indicators.support_strength, "strength");
      features.resistance_strength = this.encodeCategorical(indicators.resistance_strength, "strength");

      // === Price Features ===
      features.price_mean_20 = indicators.price_mean_20 || 0;
      features.price_std_20 = indicators.price_std_20 || 0;
      features.returns_skew = indicators.returns_skew || 0;
      features.returns_kurtosis = indicators.returns_kurtosis || 0;

      // === Confluence Features ===
      features.trend_momentum_confluence = indicators.trend_momentum_confluence || 0;
      features.rsi_macd_agreement = indicators.rsi_macd_agreement || 0;
      features.volume_price_confluence = indicators.volume_price_confluence || 0;

      // === Divergence & Breakouts ===
      features.price_rsi_divergence = indicators.price_rsi_divergence || 0;
      features.breakout_potential = indicators.breakout_potential || 0;

    } catch (err) {
      console.error("❌ Feature generation error:", err);
    }

    return features;
  }
}

module.exports = FeatureGenerator;
