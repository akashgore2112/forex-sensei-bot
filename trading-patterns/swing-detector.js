// trading-patterns/swing-detector.js
class SwingDetector {
  constructor(lookback = 10) { // Relaxed from 20
    this.lookback = lookback;
  }

  findSwingHighs(candles) {
    const swingHighs = [];
    const lookback = this.lookback;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const currentHigh = candles[i].high;
      let isSwingHigh = true;

      for (let j = i - lookback; j < i; j++) {
        if (candles[j].high >= currentHigh) {
          isSwingHigh = false;
          break;
        }
      }

      if (!isSwingHigh) continue;

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

  findSwingLows(candles) {
    const swingLows = [];
    const lookback = this.lookback;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const currentLow = candles[i].low;
      let isSwingLow = true;

      for (let j = i - lookback; j < i; j++) {
        if (candles[j].low <= currentLow) {
          isSwingLow = false;
          break;
        }
      }

      if (!isSwingLow) continue;

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

  getLatestSwingHigh(candles, beforeIndex = null) {
    const index = beforeIndex !== null ? beforeIndex : candles.length;
    const relevantCandles = candles.slice(0, index);
    
    const swingHighs = this.findSwingHighs(relevantCandles);
    
    if (swingHighs.length === 0) return null;
    
    return swingHighs[swingHighs.length - 1];
  }

  getLatestSwingLow(candles, beforeIndex = null) {
    const index = beforeIndex !== null ? beforeIndex : candles.length;
    const relevantCandles = candles.slice(0, index);
    
    const swingLows = this.findSwingLows(relevantCandles);
    
    if (swingLows.length === 0) return null;
    
    return swingLows[swingLows.length - 1];
  }

  getLatestSwings(candles, beforeIndex = null) {
    return {
      high: this.getLatestSwingHigh(candles, beforeIndex),
      low: this.getLatestSwingLow(candles, beforeIndex)
    };
  }
}

module.exports = SwingDetector;
