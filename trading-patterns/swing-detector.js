// trading-patterns/swing-detector.js
class SwingDetector {
  constructor(lookback = 20) {
    this.lookback = lookback;
  }

  /**
   * Find all swing highs in candle data
   * Swing high: candle's high > all highs within lookback period (both sides)
   */
  findSwingHighs(candles) {
    const swingHighs = [];
    const lookback = this.lookback;

    // Start from lookback to end-lookback (need candles on both sides)
    for (let i = lookback; i < candles.length - lookback; i++) {
      const currentHigh = candles[i].high;
      let isSwingHigh = true;

      // Check left side (previous candles)
      for (let j = i - lookback; j < i; j++) {
        if (candles[j].high >= currentHigh) {
          isSwingHigh = false;
          break;
        }
      }

      if (!isSwingHigh) continue;

      // Check right side (future candles)
      for (let j = i + 1; j <= i + lookback; j++) {
        if (candles[j].high >= currentHigh) {
          isSwingHigh = false;
          break;
        }
      }

      if (isSwingHigh) {
        swingHighs.push({
          index: i,
          price: currentHigh,
          timestamp: candles[i].timestamp,
          type: 'HIGH'
        });
      }
    }

    return swingHighs;
  }

  /**
   * Find all swing lows in candle data
   * Swing low: candle's low < all lows within lookback period (both sides)
   */
  findSwingLows(candles) {
    const swingLows = [];
    const lookback = this.lookback;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const currentLow = candles[i].low;
      let isSwingLow = true;

      // Check left side
      for (let j = i - lookback; j < i; j++) {
        if (candles[j].low <= currentLow) {
          isSwingLow = false;
          break;
        }
      }

      if (!isSwingLow) continue;

      // Check right side
      for (let j = i + 1; j <= i + lookback; j++) {
        if (candles[j].low <= currentLow) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingLow) {
        swingLows.push({
          index: i,
          price: currentLow,
          timestamp: candles[i].timestamp,
          type: 'LOW'
        });
      }
    }

    return swingLows;
  }

  /**
   * Get most recent swing high before given index
   */
  getLatestSwingHigh(candles, beforeIndex = null) {
    const index = beforeIndex !== null ? beforeIndex : candles.length;
    const relevantCandles = candles.slice(0, index);
    
    const swingHighs = this.findSwingHighs(relevantCandles);
    
    if (swingHighs.length === 0) return null;
    
    return swingHighs[swingHighs.length - 1];
  }

  /**
   * Get most recent swing low before given index
   */
  getLatestSwingLow(candles, beforeIndex = null) {
    const index = beforeIndex !== null ? beforeIndex : candles.length;
    const relevantCandles = candles.slice(0, index);
    
    const swingLows = this.findSwingLows(relevantCandles);
    
    if (swingLows.length === 0) return null;
    
    return swingLows[swingLows.length - 1];
  }

  /**
   * Get both latest swing high and low
   */
  getLatestSwings(candles, beforeIndex = null) {
    return {
      high: this.getLatestSwingHigh(candles, beforeIndex),
      low: this.getLatestSwingLow(candles, beforeIndex)
    };
  }
}

module.exports = SwingDetector;
