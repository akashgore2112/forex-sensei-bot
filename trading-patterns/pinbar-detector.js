// trading-patterns/pinbar-detector.js
const SwingDetector = require('./swing-detector');

class PinBarDetector {
  constructor() {
    this.swingDetector = new SwingDetector(10);
    this.minWickToBodyRatio = 2.0;
  }

  /**
   * Detect bullish pin bar (hammer)
   * Requirements:
   * - Long lower wick (2x+ body size)
   * - Close in upper 25% of candle range
   * - Forms at swing low
   */
  detectBullishPinBar(candles, indicators) {
    if (candles.length < 30) return null;

    const current = candles[candles.length - 1];
    const adx = indicators.adx[indicators.adx.length - 1];

    // Calculate candle metrics
    const range = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);

    // Rule 1: Range must be meaningful (at least 10 pips for EUR/USD)
    if (range < 0.0010) return null;

    // Rule 2: Lower wick must be 2x+ body size
    const wickToBodyRatio = body > 0 ? lowerWick / body : Infinity;
    if (wickToBodyRatio < this.minWickToBodyRatio) return null;

    // Rule 3: Upper wick should be small (max 50% of lower wick)
    if (upperWick > lowerWick * 0.5) return null;

    // Rule 4: Close must be in upper 25% of range
    const closePosition = (current.close - current.low) / range;
    if (closePosition < 0.75) return null;

    // Rule 5: ADX > 12 (some momentum, but not strict)
    if (adx <= 12) return null;

    // Rule 6: Must form at swing low
    const latestSwingLow = this.swingDetector.getLatestSwingLow(candles.slice(0, -1));
    
    if (!latestSwingLow) return null;

    // Check if current candle is near swing low (within 0.3%)
    const distanceFromSwing = Math.abs(current.low - latestSwingLow.price) / latestSwingLow.price;
    if (distanceFromSwing > 0.003) return null;

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
      swingPoint: {
        price: latestSwingLow.price,
        type: 'LOW',
        distance: Number((distanceFromSwing * 100).toFixed(2)) + '%'
      },
      adx: adx,
      reason: `Bullish pin bar at swing low ${latestSwingLow.price.toFixed(5)}, wick/body=${wickToBodyRatio.toFixed(1)}, ADX=${adx.toFixed(1)}`
    };
  }

  /**
   * Detect bearish pin bar (shooting star)
   * Requirements:
   * - Long upper wick (2x+ body size)
   * - Close in lower 25% of candle range
   * - Forms at swing high
   */
  detectBearishPinBar(candles, indicators) {
    if (candles.length < 30) return null;

    const current = candles[candles.length - 1];
    const adx = indicators.adx[indicators.adx.length - 1];

    const range = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);

    if (range < 0.0010) return null;

    // Upper wick must be 2x+ body size
    const wickToBodyRatio = body > 0 ? upperWick / body : Infinity;
    if (wickToBodyRatio < this.minWickToBodyRatio) return null;

    // Lower wick should be small
    if (lowerWick > upperWick * 0.5) return null;

    // Close must be in lower 25% of range
    const closePosition = (current.close - current.low) / range;
    if (closePosition > 0.25) return null;

    if (adx <= 12) return null;

    // Must form at swing high
    const latestSwingHigh = this.swingDetector.getLatestSwingHigh(candles.slice(0, -1));
    
    if (!latestSwingHigh) return null;

    const distanceFromSwing = Math.abs(current.high - latestSwingHigh.price) / latestSwingHigh.price;
    if (distanceFromSwing > 0.003) return null;

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
      swingPoint: {
        price: latestSwingHigh.price,
        type: 'HIGH',
        distance: Number((distanceFromSwing * 100).toFixed(2)) + '%'
      },
      adx: adx,
      reason: `Bearish pin bar at swing high ${latestSwingHigh.price.toFixed(5)}, wick/body=${wickToBodyRatio.toFixed(1)}, ADX=${adx.toFixed(1)}`
    };
  }

  /**
   * Main detection method
   */
  detect(candles, indicators) {
    const bullish = this.detectBullishPinBar(candles, indicators);
    if (bullish) return bullish;

    const bearish = this.detectBearishPinBar(candles, indicators);
    if (bearish) return bearish;

    return null;
  }
}

module.exports = PinBarDetector;
