// trading-patterns/pullback-detector.js
class PullbackDetector {
  constructor() {
    this.tolerance = 0.001; // ±0.1% as per your spec
  }

  /**
   * Check if any candle touched the target level within tolerance
   */
  hasPriceTouchedLevel(candles, targetLevel, lookback = 10) {
    const recentCandles = candles.slice(-lookback);
    
    for (const candle of recentCandles) {
      const upperBound = targetLevel * (1 + this.tolerance);
      const lowerBound = targetLevel * (1 - this.tolerance);
      
      // Check if price touched level (high/low within range)
      if (candle.high >= lowerBound && candle.low <= upperBound) {
        return {
          touched: true,
          candle: candle,
          level: targetLevel
        };
      }
    }
    
    return { touched: false };
  }

  /**
   * Detect higher low pattern on 1H (for BUY setup)
   * Requirements:
   * - Recent candle's low > previous candle's low
   * - Recent candle closes bullish (close > open)
   */
  detectHigherLow(candles, lookback = 5) {
    if (candles.length < lookback + 1) return null;
    
    const recent = candles.slice(-lookback);
    
    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];
      
      // Check: current low > previous low
      if (current.low <= previous.low) continue;
      
      // Check: current candle bullish
      if (current.close <= current.open) continue;
      
      // Found higher low
      return {
        found: true,
        candle: current,
        previousLow: previous.low,
        currentLow: current.low,
        reason: `Higher low: ${current.low.toFixed(5)} > ${previous.low.toFixed(5)}`
      };
    }
    
    return null;
  }

  /**
   * Detect lower high pattern on 1H (for SELL setup)
   * Requirements:
   * - Recent candle's high < previous candle's high
   * - Recent candle closes bearish (close < open)
   */
  detectLowerHigh(candles, lookback = 5) {
    if (candles.length < lookback + 1) return null;
    
    const recent = candles.slice(-lookback);
    
    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];
      
      // Check: current high < previous high
      if (current.high >= previous.high) continue;
      
      // Check: current candle bearish
      if (current.close >= current.open) continue;
      
      // Found lower high
      return {
        found: true,
        candle: current,
        previousHigh: previous.high,
        currentHigh: current.high,
        reason: `Lower high: ${current.high.toFixed(5)} < ${previous.high.toFixed(5)}`
      };
    }
    
    return null;
  }

  /**
   * Main method: Check if pullback is complete for entry
   * @param {Array} candles - 1H candles
   * @param {Number} engulfingLevel - 4H engulfing low (BUY) or high (SELL)
   * @param {String} direction - "BUY" or "SELL"
   * @param {Number} rsi - Current RSI value
   */
  isPullbackComplete(candles, engulfingLevel, direction, rsi) {
    if (candles.length < 10) return null;

    // Rule 1: Price touched the engulfing level
    const touchResult = this.hasPriceTouchedLevel(candles, engulfingLevel, 10);
    if (!touchResult.touched) {
      return null;
    }

    // Rule 2: RSI between 40-60 (healthy retracement)
    if (rsi < 40 || rsi > 60) {
      return null;
    }

    // Rule 3: Higher low (BUY) or lower high (SELL) formed after touch
    if (direction === "BUY") {
      const higherLow = this.detectHigherLow(candles, 5);
      if (!higherLow) return null;

      return {
        complete: true,
        direction: "BUY",
        pattern: "HIGHER_LOW",
        touchPoint: touchResult,
        confirmationCandle: higherLow.candle,
        rsi: rsi,
        reason: `Pullback to ${engulfingLevel.toFixed(5)}, ${higherLow.reason}, RSI=${rsi.toFixed(1)}`
      };
    } else if (direction === "SELL") {
      const lowerHigh = this.detectLowerHigh(candles, 5);
      if (!lowerHigh) return null;

      return {
        complete: true,
        direction: "SELL",
        pattern: "LOWER_HIGH",
        touchPoint: touchResult,
        confirmationCandle: lowerHigh.candle,
        rsi: rsi,
        reason: `Pullback to ${engulfingLevel.toFixed(5)}, ${lowerHigh.reason}, RSI=${rsi.toFixed(1)}`
      };
    }

    return null;
  }
}

module.exports = PullbackDetector;
