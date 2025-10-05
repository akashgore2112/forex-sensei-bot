// trading-patterns/pinbar-detector-strict.js
const SwingDetector = require('./swing-detector');

class PinBarDetectorStrict {
  constructor() {
    this.swingDetector = new SwingDetector(10);
    this.minWickToBodyRatio = 2.5; // Stricter from 2.0
    this.maxOppositeWickRatio = 0.25; // Stricter from 0.5
    this.minRange = 0.0015; // 15 pips minimum for EUR/USD
    this.maxBodyRatio = 0.30; // Body must be < 30% of range
  }

  /**
   * Detect bullish pin bar (hammer) with strict criteria
   */
  detectBullishPinBar(candles) {
    if (candles.length < 30) return null;

    const current = candles[candles.length - 1];
    
    // Calculate metrics
    const range = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);

    // Rule 1: Minimum range (filter out tiny candles)
    if (range < this.minRange) return null;

    // Rule 2: Body must be small relative to range
    const bodyRatio = body / range;
    if (bodyRatio > this.maxBodyRatio) return null;

    // Rule 3: Lower wick must be significant
    const wickToBodyRatio = body > 0.00001 ? lowerWick / body : lowerWick * 10000;
    if (wickToBodyRatio < this.minWickToBodyRatio) return null;

    // Rule 4: Upper wick must be small (not inverted hammer)
    if (upperWick > lowerWick * this.maxOppositeWickRatio) return null;

    // Rule 5: Close must be in upper 20% (stricter)
    const closePosition = (current.close - current.low) / range;
    if (closePosition < 0.80) return null;

    // Rule 6: Must be near swing low (context check)
    const swingContext = this.checkSwingContext(candles, "LOW", current.low);
    if (!swingContext.valid) return null;

    return {
      type: 'BULLISH_PINBAR',
      direction: 'BUY',
      candle: {
        timestamp: current.timestamp,
        open: current.open,
        high: current.high,
        low: current.low,
        close: current.close
      },
      wickSize: Number(lowerWick.toFixed(5)),
      bodySize: Number(body.toFixed(5)),
      ratio: Number(wickToBodyRatio.toFixed(2)),
      wickPercent: Number((lowerWick / range * 100).toFixed(1)),
      swingContext: swingContext,
      reason: `Bullish hammer: wick=${lowerWick.toFixed(5)} (${(lowerWick/range*100).toFixed(1)}%), body=${body.toFixed(5)} (${(bodyRatio*100).toFixed(1)}%), near swing low at ${swingContext.swing.price.toFixed(5)}`
    };
  }

  /**
   * Detect bearish pin bar (shooting star) with strict criteria
   */
  detectBearishPinBar(candles) {
    if (candles.length < 30) return null;

    const current = candles[candles.length - 1];
    
    const range = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);

    if (range < this.minRange) return null;

    const bodyRatio = body / range;
    if (bodyRatio > this.maxBodyRatio) return null;

    const wickToBodyRatio = body > 0.00001 ? upperWick / body : upperWick * 10000;
    if (wickToBodyRatio < this.minWickToBodyRatio) return null;

    // Lower wick must be small (not hammer)
    if (lowerWick > upperWick * this.maxOppositeWickRatio) return null;

    // Close must be in lower 20%
    const closePosition = (current.close - current.low) / range;
    if (closePosition > 0.20) return null;

    // Must be near swing high
    const swingContext = this.checkSwingContext(candles, "HIGH", current.high);
    if (!swingContext.valid) return null;

    return {
      type: 'BEARISH_PINBAR',
      direction: 'SELL',
      candle: {
        timestamp: current.timestamp,
        open: current.open,
        high: current.high,
        low: current.low,
        close: current.close
      },
      wickSize: Number(upperWick.toFixed(5)),
      bodySize: Number(body.toFixed(5)),
      ratio: Number(wickToBodyRatio.toFixed(2)),
      wickPercent: Number((upperWick / range * 100).toFixed(1)),
      swingContext: swingContext,
      reason: `Bearish shooting star: wick=${upperWick.toFixed(5)} (${(upperWick/range*100).toFixed(1)}%), body=${body.toFixed(5)} (${(bodyRatio*100).toFixed(1)}%), near swing high at ${swingContext.swing.price.toFixed(5)}`
    };
  }

  /**
   * Check if candle is near appropriate swing point
   * Stricter than before: must be within 0.15% and in proper zone
   */
  checkSwingContext(candles, type, candleExtreme) {
    const recentCandles = candles.slice(-50); // Last 50 candles
    
    let swings;
    if (type === "LOW") {
      swings = this.swingDetector.findSwingLows(recentCandles);
    } else {
      swings = this.swingDetector.findSwingHighs(recentCandles);
    }

    if (swings.length === 0) {
      return { valid: false, reason: "No swing points found" };
    }

    // Find closest swing
    const closestSwing = swings.reduce((closest, swing) => {
      const distance = Math.abs(candleExtreme - swing.price);
      return distance < Math.abs(candleExtreme - closest.price) ? swing : closest;
    });

    // Distance check: within 0.5% (stricter from 0.3%)
    const distance = Math.abs(candleExtreme - closestSwing.price) / closestSwing.price;
    if (distance > 0.005) {
      return { 
        valid: false, 
        reason: `Too far from swing (${(distance * 100).toFixed(2)}% > 0.15%)`,
        distance: distance 
      };
    }

    // Additional check: candle must be in bottom/top 30% of recent range
    const recentHigh = Math.max(...recentCandles.map(c => c.high));
    const recentLow = Math.min(...recentCandles.map(c => c.low));
    const recentRange = recentHigh - recentLow;
    const position = (candleExtreme - recentLow) / recentRange;

    if (type === "LOW" && position > 0.30) {
      return { 
        valid: false, 
        reason: `Not in lower zone (${(position * 100).toFixed(1)}% > 30%)` 
      };
    }

    if (type === "HIGH" && position < 0.70) {
      return { 
        valid: false, 
        reason: `Not in upper zone (${(position * 100).toFixed(1)}% < 70%)` 
      };
    }

    return {
      valid: true,
      swing: closestSwing,
      distance: Number((distance * 100).toFixed(3)) + '%',
      position: Number((position * 100).toFixed(1)) + '%'
    };
  }

  detect(candles) {
    const bullish = this.detectBullishPinBar(candles);
    if (bullish) return bullish;

    const bearish = this.detectBearishPinBar(candles);
    if (bearish) return bearish;

    return null;
  }
}

module.exports = PinBarDetectorStrict;
