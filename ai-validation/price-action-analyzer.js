// ai-validation/price-action-analyzer.js

class PriceActionAnalyzer {
  /**
   * Analyze price action from recent candles
   * @param {Array} candles - OHLCV candles
   * @returns {Object} analysis result
   */
  analyze(candles) {
    const last5 = candles.slice(-5);
    const last20 = candles.slice(-20);

    return {
      shortTerm: this.analyzeShortTerm(last5),
      mediumTerm: this.analyzeMediumTerm(last20),
      pattern: this.detectPattern(last5),
      strength: this.calculateStrength(last5)
    };
  }

  /**
   * Analyze last 5 candles (short-term direction)
   */
  analyzeShortTerm(candles) {
    const closes = candles.map(c => c.close);
    const first = closes[0];
    const last = closes[closes.length - 1];
    const change = ((last - first) / first) * 100;

    if (change > 0.5) return "STRONG_UPTREND";
    if (change > 0.2) return "UPTREND";
    if (change < -0.5) return "STRONG_DOWNTREND";
    if (change < -0.2) return "DOWNTREND";
    return "CONSOLIDATION";
  }

  /**
   * Analyze last 20 candles (medium-term position)
   */
  analyzeMediumTerm(candles) {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const highest = Math.max(...highs);
    const lowest = Math.min(...lows);
    const current = candles[candles.length - 1].close;

    const range = highest - lowest;
    if (range === 0) return "UNKNOWN";

    const position = (current - lowest) / range;

    if (position > 0.8) return "NEAR_HIGH";
    if (position < 0.2) return "NEAR_LOW";
    return "MIDDLE_RANGE";
  }

  /**
   * Detect candlestick patterns (last 3 candles)
   */
  detectPattern(candles) {
    if (candles.length < 3) return "INSUFFICIENT_DATA";
    const last3 = candles.slice(-3);

    if (this.isHigherHighs(last3) && this.isHigherLows(last3)) {
      return "BULLISH_TREND";
    }
    if (this.isLowerHighs(last3) && this.isLowerLows(last3)) {
      return "BEARISH_TREND";
    }
    return "RANGING";
  }

  isHigherHighs(candles) {
    return candles[2].high > candles[1].high &&
           candles[1].high > candles[0].high;
  }

  isHigherLows(candles) {
    return candles[2].low > candles[1].low &&
           candles[1].low > candles[0].low;
  }

  isLowerHighs(candles) {
    return candles[2].high < candles[1].high &&
           candles[1].high < candles[0].high;
  }

  isLowerLows(candles) {
    return candles[2].low < candles[1].low &&
           candles[1].low < candles[0].low;
  }

  /**
   * Calculate trend strength (body vs range ratio)
   */
  calculateStrength(candles) {
    const bodySum = candles.reduce((sum, c) => {
      return sum + Math.abs(c.close - c.open);
    }, 0);

    const rangeSum = candles.reduce((sum, c) => {
      return sum + (c.high - c.low);
    }, 0);

    const strength = rangeSum > 0 ? bodySum / rangeSum : 0;

    if (strength > 0.7) return "STRONG";
    if (strength > 0.4) return "MODERATE";
    return "WEAK";
  }
}

module.exports = PriceActionAnalyzer;
