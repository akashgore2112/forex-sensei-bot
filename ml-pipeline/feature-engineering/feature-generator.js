// ml-pipeline/feature-engineering/feature-generator.js

const math = require("mathjs");

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

  // 🔹 Helper: rolling statistics
  rollingMean(values, period = 20) {
    if (!values || values.length < period) return 0;
    const slice = values.slice(-period);
    return math.mean(slice);
  }

  rollingStd(values, period = 20) {
    if (!values || values.length < period) return 0;
    const slice = values.slice(-period);
    return math.std(slice);
  }

  calculateSkewness(values) {
    if (!values || values.length < 10) return 0;
    return math.std(values) === 0 ? 0 : math.skewness(values);
  }

  calculateKurtosis(values) {
    if (!values || values.length < 10) return 0;
    return math.std(values) === 0 ? 0 : math.kurtosis(values);
  }

  calculatePercentile(value, array) {
    if (!array || array.length === 0) return 0;
    const sorted = [...array].sort((a, b) => a - b);
    const pos = sorted.filter(v => v <= value).length;
    return (pos / sorted.length) * 100;
  }

  // 🔹 MAIN FEATURE GENERATION
  generateAllFeatures(candles, indicators) {
    const features = {};

    try {
      // Extract close prices
      const closes = candles.map(c => c.close);

      // === Trend Features ===
      features.ema_trend_strength = indicators.ema_trend_strength || 0;
      features.price_above_ema20 = indicators.price_above_ema20 ? 1 : 0;
      features.price_above_ema50 = indicators.price_above_ema50 ? 1 : 0;
      features.ema_alignment_score = indicators.ema_alignment_score || 0;
      features.ema20_slope = indicators.ema20_slope || 0;
      features.ema50_slope = indicators.ema50_slope || 0;

      // === Momentum Features ===
      features.trend_consistency = indicators.trend_consistency || 0;
      features.rsi_normalized = indicators.rsi_normalized || 0;
      features.rsi_velocity = indicators.rsi_velocity || 0;
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

      // === Statistical Features ===
      features.price_mean_20 = this.rollingMean(closes, 20);
      features.price_std_20 = this.rollingStd(closes, 20);

      // Returns for skewness/kurtosis
      const returns = [];
      for (let i = 1; i < closes.length; i++) {
        if (closes[i - 1] > 0) {
          returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
      }
      features.returns_skew = this.calculateSkewness(returns);
      features.returns_kurtosis = this.calculateKurtosis(returns);

      // Current price percentile vs history
      const currentPrice = closes[closes.length - 1] || 0;
      features.price_percentile = this.calculatePercentile(currentPrice, closes);

      // === Confluence & Divergence Features ===
      features.trend_momentum_confluence = indicators.trend_momentum_confluence || 0;
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
