// ml-pipeline/feature-engineering/feature-generator.js
// ============================================================================
// 📊 Feature Generator (Phase 2 - Step 7.1) - FIXED
// Goal: Compute features FROM Phase 1 raw indicators
// ============================================================================

const math = require("mathjs");

class FeatureGenerator {
  constructor() {}

  /**
   * Main method: Generate all 40+ features from Phase 1 indicators
   * @param {Array} candles - Raw OHLCV candles
   * @param {Object} indicators - Phase 1 indicator arrays (ema20, rsi14, etc.)
   * @returns {Object} Computed features ready for ML models
   */
  generateAllFeatures(candles, indicators) {
    if (!candles || candles.length < 100) {
      throw new Error("Need at least 100 candles for feature generation");
    }

    const features = {};

    // Get latest values from arrays
    const latest = this.extractLatestValues(candles, indicators);

    // Generate feature groups
    Object.assign(features, this.generateTrendFeatures(candles, indicators, latest));
    Object.assign(features, this.generateMomentumFeatures(indicators, latest));
    Object.assign(features, this.generateVolatilityFeatures(indicators, latest));
    Object.assign(features, this.generateVolumeFeatures(candles, latest));
    Object.assign(features, this.generateSupportResistanceFeatures(indicators, latest));
    Object.assign(features, this.generateStatisticalFeatures(candles));

    return features;
  }

  // ==========================================================================
  // Extract Latest Values from Phase 1 Arrays
  // ==========================================================================
  extractLatestValues(candles, indicators) {
    const lastIdx = candles.length - 1;
    
    return {
      close: candles[lastIdx].close,
      high: candles[lastIdx].high,
      low: candles[lastIdx].low,
      volume: candles[lastIdx].volume || 0,
      
      ema20: this.getLast(indicators.ema20),
      ema50: this.getLast(indicators.ema50),
      ema200: this.getLast(indicators.ema200),
      
      rsi: this.getLast(indicators.rsi14),
      
      macd: this.getLast(indicators.macd?.macd),
      macdSignal: this.getLast(indicators.macd?.signal),
      macdHist: this.getLast(indicators.macd?.histogram),
      
      atr: this.getLast(indicators.atr),
      adx: this.getLast(indicators.adx),
      
      bbUpper: this.getLast(indicators.bollinger?.upper),
      bbMiddle: this.getLast(indicators.bollinger?.middle),
      bbLower: this.getLast(indicators.bollinger?.lower)
    };
  }

  // ==========================================================================
  // TREND FEATURES (7 features)
  // ==========================================================================
  generateTrendFeatures(candles, indicators, latest) {
    const features = {};

    // EMA trend strength (0-1 scale)
    const emaSpread = Math.abs(latest.ema20 - latest.ema50) / latest.close;
    features.ema_trend_strength = Math.min(1, emaSpread * 100);

    // Price position vs EMAs
    features.price_above_ema20 = latest.close > latest.ema20 ? 1 : 0;
    features.price_above_ema50 = latest.close > latest.ema50 ? 1 : 0;

    // EMA alignment score
    const bullishAligned = latest.ema20 > latest.ema50 && latest.ema50 > latest.ema200;
    const bearishAligned = latest.ema20 < latest.ema50 && latest.ema50 < latest.ema200;
    features.ema_alignment_score = bullishAligned ? 1 : bearishAligned ? -1 : 0;

    // EMA slopes (rate of change)
    const ema20Array = indicators.ema20.slice(-10);
    const ema50Array = indicators.ema50.slice(-10);
    features.ema20_slope = this.calculateSlope(ema20Array);
    features.ema50_slope = this.calculateSlope(ema50Array);

    // Trend consistency (how often price stays above/below EMA20)
    const last20Candles = candles.slice(-20);
    const ema20Last20 = indicators.ema20.slice(-20);
    const aboveCount = last20Candles.filter((c, i) => c.close > ema20Last20[i]).length;
    features.trend_consistency = aboveCount / 20;

    return features;
  }

  // ==========================================================================
  // MOMENTUM FEATURES (6 features)
  // ==========================================================================
  generateMomentumFeatures(indicators, latest) {
    const features = {};

    // RSI normalized to [0, 1]
    features.rsi_normalized = latest.rsi / 100;

    // RSI velocity (rate of change)
    const rsiArray = indicators.rsi14.slice(-5);
    features.rsi_velocity = rsiArray.length >= 2 
      ? (rsiArray[rsiArray.length - 1] - rsiArray[rsiArray.length - 2]) / 100
      : 0;

    // MACD signals
    features.macd_above_signal = latest.macd > latest.macdSignal ? 1 : 0;
    features.macd_momentum = latest.macdHist || 0;

    // Combined momentum score
    const rsiMom = (latest.rsi - 50) / 50; // [-1, 1]
    const macdMom = features.macd_above_signal ? 1 : -1;
    features.momentum_score = (rsiMom + macdMom) / 2;

    // Momentum divergence (price vs RSI)
    features.momentum_divergence = this.detectMomentumDivergence(indicators);

    return features;
  }

  // ==========================================================================
  // VOLATILITY FEATURES (5 features)
  // ==========================================================================
  generateVolatilityFeatures(indicators, latest) {
    const features = {};

    // ATR normalized to close price
    features.atr_normalized = latest.atr / latest.close;

    // Volatility spike (current ATR vs average)
    const atrArray = indicators.atr.slice(-20);
    const avgATR = this.safeMean(atrArray);
    const atrRatio = latest.atr / avgATR;
    features.volatility_spike = atrRatio > 1.5 ? 1 : 0;

    // Bollinger Band squeeze
    const bbWidth = latest.bbUpper - latest.bbLower;
    const bbWidthArray = [];
    for (let i = Math.max(0, indicators.bollinger.upper.length - 50); 
         i < indicators.bollinger.upper.length; i++) {
      bbWidthArray.push(indicators.bollinger.upper[i] - indicators.bollinger.lower[i]);
    }
    const avgBBWidth = this.safeMean(bbWidthArray);
    features.bb_squeeze = bbWidth < avgBBWidth * 0.7 ? 1 : 0;

    // BB width percentile
    const sorted = [...bbWidthArray].sort((a, b) => a - b);
    const position = sorted.filter(w => w <= bbWidth).length;
    features.bb_width_percentile = (position / sorted.length) * 100;

    // Volatility regime classification
    if (atrRatio > 1.5) features.volatility_regime = 1; // HIGH
    else if (atrRatio < 0.8) features.volatility_regime = -1; // LOW
    else features.volatility_regime = 0; // MEDIUM

    return features;
  }

  // ==========================================================================
  // VOLUME FEATURES (4 features)
  // ==========================================================================
  generateVolumeFeatures(candles, latest) {
    const features = {};

    // Volume ratio vs average
    const volumes = candles.slice(-50).map(c => c.volume || 0);
    const avgVolume = this.safeMean(volumes);
    features.volume_ratio = avgVolume > 0 ? latest.volume / avgVolume : 1;

    // Volume trend
    const recentVolume = this.safeMean(candles.slice(-5).map(c => c.volume || 0));
    features.volume_trend = recentVolume > avgVolume * 1.2 ? 1 : 
                            recentVolume < avgVolume * 0.8 ? -1 : 0;

    // Volume spike detection
    features.volume_spike = latest.volume > avgVolume * 1.5 ? 1 : 0;

    // Volume confirmation (high volume + price move)
    const priceChange = Math.abs(candles[candles.length - 1].close - 
                                 candles[candles.length - 2].close);
    features.volume_confirmation = features.volume_spike && priceChange > 0.001 ? 1 : 0;

    return features;
  }

  // ==========================================================================
  // SUPPORT/RESISTANCE FEATURES (4 features)
  // ==========================================================================
  generateSupportResistanceFeatures(indicators, latest) {
    const features = {};

    if (!indicators.supportResistance) {
      features.distance_to_support = 0;
      features.distance_to_resistance = 0;
      features.support_strength = 0;
      features.resistance_strength = 0;
      return features;
    }

    const sr = indicators.supportResistance;

    // Distance to nearest support
    if (sr.support && sr.support.length > 0) {
      const nearestSupport = sr.support.sort((a, b) => 
        Math.abs(latest.close - b.level) - Math.abs(latest.close - a.level)
      )[0];
      features.distance_to_support = (latest.close - nearestSupport.level) / latest.close;
      features.support_strength = this.encodeStrength(nearestSupport.strength);
    } else {
      features.distance_to_support = 0;
      features.support_strength = 0;
    }

    // Distance to nearest resistance
    if (sr.resistance && sr.resistance.length > 0) {
      const nearestResistance = sr.resistance.sort((a, b) => 
        Math.abs(latest.close - a.level) - Math.abs(latest.close - b.level)
      )[0];
      features.distance_to_resistance = (nearestResistance.level - latest.close) / latest.close;
      features.resistance_strength = this.encodeStrength(nearestResistance.strength);
    } else {
      features.distance_to_resistance = 0;
      features.resistance_strength = 0;
    }

    return features;
  }

  // ==========================================================================
  // STATISTICAL FEATURES (5 features)
  // ==========================================================================
  generateStatisticalFeatures(candles) {
    const features = {};

    const closes = candles.slice(-20).map(c => c.close);

    features.price_mean_20 = this.safeMean(closes);
    features.price_std_20 = this.safeStd(closes);
    features.returns_skew = this.calculateSkewness(closes);
    features.returns_kurtosis = this.calculateKurtosis(closes);

    // Price percentile (where is current price in recent range)
    const sorted = [...closes].sort((a, b) => a - b);
    const currentClose = closes[closes.length - 1];
    const position = sorted.filter(c => c <= currentClose).length;
    features.price_percentile = (position / sorted.length) * 100;

    return features;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================
  getLast(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const val = arr[arr.length - 1];
    return (val != null && Number.isFinite(val)) ? val : 0;
  }

  safeMean(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const valid = arr.filter(v => v != null && Number.isFinite(v));
    if (valid.length === 0) return 0;
    return valid.reduce((sum, v) => sum + v, 0) / valid.length;
  }

  safeStd(arr) {
    if (!Array.isArray(arr) || arr.length < 2) return 0;
    try {
      return math.std(arr);
    } catch {
      return 0;
    }
  }

  calculateSlope(arr) {
    if (!arr || arr.length < 2) return 0;
    const n = arr.length;
    const xMean = (n - 1) / 2;
    const yMean = this.safeMean(arr);
    
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (arr[i] - yMean);
      den += Math.pow(i - xMean, 2);
    }
    
    return den === 0 ? 0 : num / den;
  }

  calculateSkewness(arr) {
    if (!arr || arr.length < 3) return 0;
    try {
      const mean = this.safeMean(arr);
      const std = this.safeStd(arr);
      if (std === 0) return 0;
      
      const n = arr.length;
      const skew = arr.reduce((sum, v) => sum + Math.pow((v - mean) / std, 3), 0) / n;
      return skew;
    } catch {
      return 0;
    }
  }

  calculateKurtosis(arr) {
    if (!arr || arr.length < 4) return 0;
    try {
      const mean = this.safeMean(arr);
      const std = this.safeStd(arr);
      if (std === 0) return 0;
      
      const n = arr.length;
      const kurt = arr.reduce((sum, v) => sum + Math.pow((v - mean) / std, 4), 0) / n;
      return kurt - 3; // Excess kurtosis
    } catch {
      return 0;
    }
  }

  detectMomentumDivergence(indicators) {
    // Simple divergence: price making higher highs but RSI making lower highs
    // Returns 1 if divergence detected, 0 otherwise
    // Simplified for now
    return 0;
  }

  encodeStrength(strength) {
    const mapping = { WEAK: 1, MEDIUM: 2, STRONG: 3 };
    return mapping[strength] || 0;
  }
}

module.exports = FeatureGenerator;
