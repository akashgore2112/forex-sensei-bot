// ============================================================================
// 📊 Feature Generator (Phase 2 - Step 7.1)
// Centralized feature extraction system
// ============================================================================

class FeatureGenerator {
  constructor() {}

  // 🔹 Main entry point
  generateAllFeatures(candles, indicators) {
    return {
      // ---- Trend Features ----
      ...this.generateTrendFeatures(indicators, candles),

      // ---- Momentum Features ----
      ...this.generateMomentumFeatures(indicators),

      // ---- Volatility Features ----
      ...this.generateVolatilityFeatures(indicators, candles),

      // ---- Volume Features ----
      ...this.generateVolumeFeatures(candles),

      // ---- Support/Resistance Features ----
      ...this.generateSupportResistanceFeatures(indicators),

      // ---- Statistical Features ----
      ...this.generateStatisticalFeatures(candles),

      // ---- Cross-Features ----
      ...this.generateCrossFeatures(indicators, candles),
    };
  }

  // =========================================================================
  // 📌 Trend Features
  // =========================================================================
  generateTrendFeatures(indicators, candles) {
    const ema20 = indicators.ema20;
    const ema50 = indicators.ema50;
    const ema200 = indicators.ema200;
    const lastClose = candles[candles.length - 1].close;

    const emaTrendStrength = (ema20 - ema50) / ema50;
    const emaAlignment =
      ema20 > ema50 && ema50 > ema200
        ? 1
        : ema20 < ema50 && ema50 < ema200
        ? -1
        : 0;

    return {
      ema_trend_strength: emaTrendStrength,
      price_above_ema20: lastClose > ema20 ? 1 : 0,
      price_above_ema50: lastClose > ema50 ? 1 : 0,
      ema_alignment_score: emaAlignment,
      ema20_slope: this.calculateSlope(indicators.ema20),
      ema50_slope: this.calculateSlope(indicators.ema50),
      trend_consistency: this.calculateTrendConsistency(candles),
    };
  }

  // =========================================================================
  // 📌 Momentum Features
  // =========================================================================
  generateMomentumFeatures(indicators) {
    const rsi = indicators.rsi14;
    const macdLine = indicators.macd.macd;
    const macdSignal = indicators.macd.signal;
    const macdHist = indicators.macd.histogram;

    return {
      rsi_normalized: (rsi - 50) / 50, // -1 to 1 scale
      rsi_velocity: this.calculateVelocity(indicators.rsi14_series),
      macd_above_signal: macdLine > macdSignal ? 1 : 0,
      macd_momentum: macdHist,
      momentum_score: Math.tanh(rsi / 100 + macdHist),
      momentum_divergence: this.detectRSIDivergence(indicators),
    };
  }

  // =========================================================================
  // 📌 Volatility Features
  // =========================================================================
  generateVolatilityFeatures(indicators, candles) {
    const atr = indicators.atr;
    const lastClose = candles[candles.length - 1].close;

    return {
      atr_normalized: atr / lastClose,
      volatility_spike: atr > this.calculateRollingMean(indicators.atr_series, 20) * 1.5 ? 1 : 0,
      bb_squeeze: this.detectBollingerSqueeze(indicators.bollinger),
      bb_width_percentile: this.calculatePercentile(indicators.bollinger.width),
      volatility_regime: this.classifyVolatility(atr),
    };
  }

  // =========================================================================
  // 📌 Volume Features
  // =========================================================================
  generateVolumeFeatures(candles) {
    const volumes = candles.map(c => c.volume || 0);
    const lastVol = volumes[volumes.length - 1];
    const avgVol = this.calculateRollingMean(volumes, 20);

    return {
      volume_ratio: avgVol ? lastVol / avgVol : 1,
      volume_trend: lastVol > avgVol ? "INCREASING" : "DECREASING",
      volume_spike: avgVol ? (lastVol > 1.5 * avgVol ? 1 : 0) : 0,
      volume_confirmation: lastVol > avgVol ? 1 : 0,
    };
  }

  // =========================================================================
  // 📌 Support/Resistance Features
  // =========================================================================
  generateSupportResistanceFeatures(indicators) {
    const supports = indicators.supportResistance?.support || [];
    const resistances = indicators.supportResistance?.resistance || [];
    const lastClose = indicators.close || 0;

    const nearestSupport = supports.length
      ? Math.min(...supports.map(s => Math.abs(lastClose - s.level)))
      : 0;
    const nearestResistance = resistances.length
      ? Math.min(...resistances.map(r => Math.abs(r.level - lastClose)))
      : 0;

    return {
      distance_to_support: nearestSupport,
      distance_to_resistance: nearestResistance,
      support_strength: supports.length ? supports[0].strength : 0,
      resistance_strength: resistances.length ? resistances[0].strength : 0,
    };
  }

  // =========================================================================
  // 📌 Statistical Features
  // =========================================================================
  generateStatisticalFeatures(candles) {
    const closes = candles.map(c => c.close);
    const returns = closes.slice(1).map((c, i) => c / closes[i] - 1);

    return {
      price_mean_20: this.calculateRollingMean(closes, 20),
      price_std_20: this.calculateRollingStd(closes, 20),
      returns_skew: this.calculateSkewness(returns),
      returns_kurtosis: this.calculateKurtosis(returns),
      price_percentile: this.calculatePercentile(closes),
    };
  }

  // =========================================================================
  // 📌 Cross-Indicator Features
  // =========================================================================
  generateCrossFeatures(indicators, candles) {
    const rsi = indicators.rsi14;
    const macdHist = indicators.macd.histogram;
    const lastClose = candles[candles.length - 1].close;
    const ema20 = indicators.ema20;

    return {
      trend_momentum_confluence: Math.tanh(rsi / 100 + macdHist),
      rsi_macd_agreement: (rsi > 50 && macdHist > 0) || (rsi < 50 && macdHist < 0) ? 1 : 0,
      volume_price_confirmation: lastClose > ema20 ? 1 : 0,
      price_rsi_divergence: this.detectRSIDivergence(indicators),
      breakout_potential: Math.abs(lastClose - ema20) / ema20,
    };
  }

  // =========================================================================
  // 📌 Helper Functions
  // =========================================================================
  calculateSlope(series) {
    if (!series || series.length < 2) return 0;
    return series[series.length - 1] - series[series.length - 2];
  }

  calculateVelocity(series) {
    if (!series || series.length < 2) return 0;
    return series[series.length - 1] - series[series.length - 2];
  }

  calculateRollingMean(series, n = 20) {
    if (!series || series.length < n) return 0;
    return series.slice(-n).reduce((a, b) => a + b, 0) / n;
  }

  calculateRollingStd(series, n = 20) {
    const mean = this.calculateRollingMean(series, n);
    const slice = series.slice(-n);
    const variance =
      slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
    return Math.sqrt(variance);
  }

  calculateSkewness(series) {
    if (!series.length) return 0;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const std = this.calculateRollingStd(series, series.length);
    const n = series.length;
    return (
      (n / ((n - 1) * (n - 2))) *
      series.reduce((a, b) => a + Math.pow((b - mean) / std, 3), 0)
    );
  }

  calculateKurtosis(series) {
    if (!series.length) return 0;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const std = this.calculateRollingStd(series, series.length);
    const n = series.length;
    return (
      (n * (n + 1)) /
        ((n - 1) * (n - 2) * (n - 3)) *
        series.reduce((a, b) => a + Math.pow((b - mean) / std, 4), 0) -
      (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))
    );
  }

  calculatePercentile(series) {
    if (!series || !series.length) return 0;
    const sorted = [...series].sort((a, b) => a - b);
    const last = series[series.length - 1];
    const rank = sorted.findIndex(v => v >= last);
    return (rank / sorted.length) * 100;
  }

  classifyVolatility(atr) {
    if (atr < 0.005) return "LOW";
    if (atr < 0.015) return "MEDIUM";
    return "HIGH";
  }

  detectRSIDivergence(indicators) {
    // Simple divergence detection placeholder
    return 0; // TODO: advanced logic
  }

  detectBollingerSqueeze(bollinger) {
    if (!bollinger || !bollinger.upper || !bollinger.lower) return 0;
    const width = bollinger.upper - bollinger.lower;
    return width < 0.01 ? 1 : 0;
  }

  calculateTrendConsistency(candles) {
    if (!candles || candles.length < 10) return 0;
    let upMoves = 0;
    for (let i = 1; i < candles.length; i++) {
      if (candles[i].close > candles[i - 1].close) upMoves++;
    }
    return upMoves / candles.length;
  }
}

module.exports = FeatureGenerator;
