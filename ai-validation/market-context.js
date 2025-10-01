// ai-validation/market-context.js
const PriceActionAnalyzer = require('./price-action-analyzer');
const TechnicalEvents = require('./technical-events');

class MarketContext {
  constructor() {
    this.priceActionAnalyzer = new PriceActionAnalyzer();
    this.technicalEvents = new TechnicalEvents();
  }

  /**
   * Analyze complete market context
   * @param {Array} candles - From Phase 1 MTFA (daily candles, OHLCV)
   * @param {Object} indicators - From Phase 1 swing-indicators
   * @param {Object} ensemble - From Phase 2 ensemble prediction
   */
  analyze(candles, indicators, ensemble) {
    if (!candles || candles.length < 50) {
      throw new Error("Need at least 50 candles for context analysis");
    }

    return {
      priceAction: this.priceActionAnalyzer.analyze(candles),
      volumeTrend: this.analyzeVolume(candles),
      volatilityState: this.analyzeVolatility(ensemble),
      recentEvents: this.technicalEvents.detect(candles, indicators),
      marketMood: this.assessMarketMood(candles)
    };
  }

  /**
   * Analyze volume trends
   */
  analyzeVolume(candles) {
    const recent5 = candles.slice(-5).map(c => c.volume || 0);
    const recent20 = candles.slice(-20).map(c => c.volume || 0);

    const avg5 = recent5.reduce((a, b) => a + b, 0) / 5;
    const avg20 = recent20.reduce((a, b) => a + b, 0) / 20;

    if (avg20 === 0) return "UNKNOWN";

    const ratio = avg5 / avg20;
    if (ratio > 1.3) return "INCREASING";
    if (ratio < 0.7) return "DECREASING";
    return "STABLE";
  }

  /**
   * Analyze volatility state from ensemble
   */
  analyzeVolatility(ensemble) {
    const volLevel = ensemble.models?.volatility?.volatilityLevel || "UNKNOWN";
    const atr = ensemble.models?.volatility?.currentVolatility || 0;
    return `${volLevel} (ATR: ${atr.toFixed(6)})`;
  }

  /**
   * Assess overall market mood
   */
  assessMarketMood(candles) {
    const last10 = candles.slice(-10);
    let bullishCount = 0;
    let bearishCount = 0;

    for (const candle of last10) {
      if (candle.close > candle.open) bullishCount++;
      else if (candle.close < candle.open) bearishCount++;
    }

    if (bullishCount > 7) return "STRONGLY_BULLISH";
    if (bullishCount > 5) return "BULLISH";
    if (bearishCount > 7) return "STRONGLY_BEARISH";
    if (bearishCount > 5) return "BEARISH";
    return "NEUTRAL";
  }
}

module.exports = MarketContext;
