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
    const latestPrice = marketData[marketData.length - 1].close;
    return {
      price_above_ema20: latestPrice > indicators.ema20.slice(-1)[0] ? 1 : 0,
      price_above_ema50: latestPrice > indicators.ema50.slice(-1)[0] ? 1 : 0,
      price_above_ema200: latestPrice > indicators.ema200.slice(-1)[0] ? 1 : 0,
      ema_alignment: this.checkEMAAlignment(indicators) // 1= bullish, -1= bearish, 0= mixed
    };
  }

  checkEMAAlignment(indicators) {
    const ema20 = indicators.ema20.slice(-1)[0];
    const ema50 = indicators.ema50.slice(-1)[0];
    const ema200 = indicators.ema200.slice(-1)[0];

    if (ema20 > ema50 && ema50 > ema200) return 1;
    if (ema20 < ema50 && ema50 < ema200) return -1;
    return 0;
  }

  // =========================
  // Momentum Features
  // =========================
  generateMomentumFeatures(indicators) {
    const rsi = indicators.rsi.slice(-1)[0];
    const macd = indicators.macd.histogram.slice(-1)[0];
    return {
      rsi_normalized: (rsi - 50) / 50, // -1 to +1
      macd_histogram: macd,
      momentum_score: Math.sign(macd) * Math.abs(rsi - 50) / 50
    };
  }

  // =========================
  // Volatility Features
  // =========================
  generateVolatilityFeatures(marketData, indicators) {
    const atr = indicators.atr.slice(-1)[0];
    const bbUpper = indicators.bollinger.upper.slice(-1)[0];
    const bbLower = indicators.bollinger.lower.slice(-1)[0];
    const latestPrice = marketData[marketData.length - 1].close;
    const bbWidth = bbUpper - bbLower;

    return {
      atr_normalized: atr / latestPrice,
      bb_width: bbWidth / latestPrice,
      volatility_spike: atr > this.avg(indicators.atr) * 1.5 ? 1 : 0
    };
  }

  avg(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  // =========================
  // Pattern Features
  // =========================
  generatePatternFeatures(marketData) {
    const last3 = marketData.slice(-3).map(c => c.close);
    return {
      higher_highs: last3[2] > last3[1] && last3[1] > last3[0] ? 1 : 0,
      higher_lows: marketData[marketData.length - 1].low >
                   marketData[marketData.length - 2].low ? 1 : 0,
      breakout_pattern: last3[2] > Math.max(...last3.slice(0, 2)) ? 1 : 0
    };
  }

  // =========================
  // Statistical Features
  // =========================
  generateStatisticalFeatures(marketData) {
    const closes = marketData.map(c => c.close);
    const mean = this.avg(closes);
    const std = Math.sqrt(this.avg(closes.map(p => (p - mean) ** 2)));
    const lastClose = closes.slice(-1)[0];

    return {
      z_score: (lastClose - mean) / std,
      rolling_mean: mean,
      rolling_std: std
    };
  }
}

module.exports = FeatureGenerator;
