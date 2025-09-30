// ml-pipeline/feature-engineering/feature-generator.js

class FeatureGenerator {
  constructor() {}

  // ✅ Safe divide function
  safeDivide(a, b) {
    if (b === 0 || !b || isNaN(a) || isNaN(b)) return 0;
    return a / b;
  }

  // ✅ Safe number (replace NaN/undefined with 0)
  safeNumber(v) {
    return (isNaN(v) || v === undefined || v === null) ? 0 : v;
  }

  // ✅ Generate all features
  generateAllFeatures(candles, indicators) {
    const latest = candles[candles.length - 1] || {};

    const features = {};

    // =============================
    // 🔹 Trend Features
    // =============================
    features.ema_trend_strength = this.safeNumber(
      (this.safeDivide(indicators.ema20, indicators.ema50) +
        this.safeDivide(indicators.ema50, indicators.ema200)) / 2
    );

    features.price_above_ema20 = latest.close > indicators.ema20 ? 1 : 0;
    features.price_above_ema50 = latest.close > indicators.ema50 ? 1 : 0;

    features.ema_alignment_score = this.safeNumber(
      (indicators.ema20 > indicators.ema50 && indicators.ema50 > indicators.ema200) ? 1 : 0
    );

    features.ema20_slope = this.safeNumber(indicators.ema20_slope);
    features.ema50_slope = this.safeNumber(indicators.ema50_slope);

    features.trend_consistency = this.safeNumber(indicators.trend_consistency);

    // =============================
    // 🔹 Momentum Features
    // =============================
    features.rsi_normalized = this.safeDivide(indicators.rsi14, 100);
    features.rsi_velocity = this.safeNumber(indicators.rsi_velocity);

    features.macd_above_signal = (indicators.macd > indicators.signal) ? 1 : 0;
    features.macd_momentum = this.safeNumber(indicators.histogram);

    features.momentum_score = this.safeNumber(indicators.momentum_score);
    features.momentum_divergence = this.safeNumber(indicators.momentum_divergence);

    // =============================
    // 🔹 Volatility Features
    // =============================
    features.atr_normalized = this.safeDivide(indicators.atr, latest.close);
    features.volatility_spike = this.safeNumber(indicators.volatility_spike);
    features.bb_squeeze = this.safeNumber(indicators.bb_squeeze);
    features.bb_width_percentile = this.safeNumber(indicators.bb_width_percentile);
    features.volatility_regime = indicators.volatility_regime || "UNKNOWN";

    // =============================
    // 🔹 Volume Features
    // =============================
    const avgVolume = this.safeNumber(
      candles.slice(-20).reduce((sum, c) => sum + (c.volume || 0), 0) / 20
    );

    features.volume_ratio = this.safeDivide(latest.volume || 0, avgVolume);
    features.volume_trend = indicators.volume_trend || "UNKNOWN";
    features.volume_spike = this.safeNumber(indicators.volume_spike);
    features.volume_confirmation = this.safeNumber(indicators.volume_confirmation);

    // =============================
    // 🔹 Support/Resistance Features
    // =============================
    features.distance_to_support = this.safeNumber(indicators.distance_to_support);
    features.distance_to_resistance = this.safeNumber(indicators.distance_to_resistance);
    features.support_strength = indicators.support_strength || "WEAK";
    features.resistance_strength = indicators.resistance_strength || "WEAK";

    // =============================
    // 🔹 Statistical Features
    // =============================
    features.price_mean_20 = this.safeNumber(indicators.price_mean_20);
    features.price_std_20 = this.safeNumber(indicators.price_std_20);
    features.returns_skew = this.safeNumber(indicators.returns_skew);
    features.returns_kurtosis = this.safeNumber(indicators.returns_kurtosis);
    features.price_percentile = this.safeNumber(indicators.price_percentile);

    // =============================
    // 🔹 Cross Features
    // =============================
    features.trend_momentum_confluence = this.safeNumber(indicators.trend_momentum_confluence);
    features.rsi_macd_agreement = this.safeNumber(indicators.rsi_macd_agreement);
    features.volume_price_confirmation = this.safeNumber(indicators.volume_price_confirmation);
    features.price_rsi_divergence = this.safeNumber(indicators.price_rsi_divergence);
    features.breakout_potential = this.safeNumber(indicators.breakout_potential);

    return features;
  }
}

module.exports = FeatureGenerator;
