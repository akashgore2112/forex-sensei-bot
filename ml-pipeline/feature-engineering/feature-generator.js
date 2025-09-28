// ml-pipeline/feature-engineering/feature-generator.js

class FeatureGenerator {
  constructor() {}

  generateAllFeatures(marketData, indicators) {
    return {
      ...this.generateTrendFeatures(marketData, indicators),
      ...this.generateMomentumFeatures(indicators),
      ...this.generateVolatilityFeatures(marketData, indicators),
      ...this.generatePatternFeatures(marketData),
      ...this.generateStatisticalFeatures(marketData)
    };
  }

  // =========================
  // Trend Features
  // =========================
  generateTrendFeatures(marketData, indicators) {
    const latestPrice = marketData?.[marketData.length - 1]?.close || 0;

    return {
      price_above_ema20: latestPrice > (indicators?.ema20 || 0) ? 1 : 0,
      price_above_ema50: latestPrice > (indicators?.ema50 || 0) ? 1 : 0,
      price_above_ema200: latestPrice > (indicators?.ema200 || 0) ? 1 : 0,
      ema_alignment: this.checkEMAAlignment(indicators)
    };
  }

  checkEMAAlignment(indicators) {
    const ema20 = indicators?.ema20 ?? 0;
    const ema50 = indicators?.ema50 ?? 0;
    const ema200 = indicators?.ema200 ?? 0;

    if (ema20 > ema50 && ema50 > ema200) return 1;
    if (ema20 < ema50 && ema50 < ema200) return -1;
    return 0;
  }

  // =========================
  // Momentum Features
  // =========================
  generateMomentumFeatures(indicators) {
    const rsi = indicators?.rsi14 ?? 50;  // 👈 rename fix
    const macdHist = indicators?.macd?.histogram ?? 0;

    return {
      rsi_normalized: (rsi - 50) / 50, // -1 to +1
      macd_histogram: macdHist,
      momentum_score: Math.sign(macdHist) * Math.abs(rsi - 50) / 50
    };
  }

  // =========================
  // Volatility Features
  // =========================
  generateVolatilityFeatures(marketData, indicators) {
    const atr = indicators?.atr ?? 0;
    const bbUpper = indicators?.bollinger?.upper ?? 0;
    const bbLower = indicators?.bollinger?.lower ?? 0;
    const latestPrice = marketData?.[marketData.length - 1]?.close || 1;
    const bbWidth = bbUpper - bbLower;

    return {
      atr_normalized: atr / latestPrice,
      bb_width: bbWidth / latestPrice,
      volatility_spike: atr > (atr * 1.5) ? 1 : 0
    };
  }

  // =========================
  // Pattern Features
  // =========================
  generatePatternFeatures(marketData) {
    if (!marketData || marketData.length < 3) {
      return { higher_highs: 0, higher_lows: 0, breakout_pattern: 0 };
    }

    const last3 = marketData.slice(-3).map(c => c.close);

    return {
      higher_highs: last3[2] > last3[1] && last3[1] > last3[0] ? 1 : 0,
      higher_lows: marketData[marketData.length - 1].low >
                   marketData[marketData.length - 2].low ? 1 : 0,
      breakout_pattern: last3[2] > Math.max(last3[0], last3[1]) ? 1 : 0
    };
  }

  // =========================
  // Statistical Features
  // =========================
  generateStatisticalFeatures(marketData) {
    if (!marketData || marketData.length === 0) {
      return { z_score: 0, rolling_mean: 0, rolling_std: 0 };
    }

    const closes = marketData.map(c => c.close);
    const mean = this.avg(closes);
    const std = Math.sqrt(this.avg(closes.map(p => (p - mean) ** 2))) || 1;
    const lastClose = closes[closes.length - 1];

    return {
      z_score: (lastClose - mean) / std,
      rolling_mean: mean,
      rolling_std: std
    };
  }

  avg(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}

module.exports = FeatureGenerator;
