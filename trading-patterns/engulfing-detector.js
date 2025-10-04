// trading-patterns/engulfing-detector.js
const SwingDetector = require('./swing-detector');

class EngulfingDetector {
  constructor() {
    this.swingDetector = new SwingDetector(20);
  }

  /**
   * Detect bullish engulfing on 4H that closes beyond swing high
   */
  detectBullishEngulfing(candles, indicators) {
    if (candles.length < 50) return null;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const adx = indicators.adx[indicators.adx.length - 1];

    // Rule 1: Previous candle bearish
    if (previous.close >= previous.open) return null;

    // Rule 2: Current candle bullish
    if (current.close <= current.open) return null;

    // Rule 3: Current body engulfs previous body
    const currentBodyEngulfs = 
      current.open < previous.close && 
      current.close > previous.open;

    if (!currentBodyEngulfs) return null;

    // Rule 4: ADX > 20 (trend strength)
    if (adx <= 20) return null;

    // Rule 5: Current close > latest swing high
    const latestSwingHigh = this.swingDetector.getLatestSwingHigh(candles.slice(0, -1));
    
    if (!latestSwingHigh) return null;
    
    if (current.close <= latestSwingHigh.price) return null;

    // All conditions met
    return {
      type: 'BULLISH_ENGULFING',
      direction: 'BUY',
      candle: {
        timestamp: current.timestamp,
        open: current.open,
        high: current.high,
        low: current.low,
        close: current.close
      },
      swingBroken: latestSwingHigh,
      adx: adx,
      reason: `Bullish engulfing broke swing high at ${latestSwingHigh.price.toFixed(5)}, ADX=${adx.toFixed(1)}`
    };
  }

  /**
   * Detect bearish engulfing on 4H that closes beyond swing low
   */
  detectBearishEngulfing(candles, indicators) {
    if (candles.length < 50) return null;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const adx = indicators.adx[indicators.adx.length - 1];

    // Rule 1: Previous candle bullish
    if (previous.close <= previous.open) return null;

    // Rule 2: Current candle bearish
    if (current.close >= current.open) return null;

    // Rule 3: Current body engulfs previous body
    const currentBodyEngulfs = 
      current.open > previous.close && 
      current.close < previous.open;

    if (!currentBodyEngulfs) return null;

    // Rule 4: ADX > 20
    if (adx <= 20) return null;

    // Rule 5: Current close < latest swing low
    const latestSwingLow = this.swingDetector.getLatestSwingLow(candles.slice(0, -1));
    
    if (!latestSwingLow) return null;
    
    if (current.close >= latestSwingLow.price) return null;

    // All conditions met
    return {
      type: 'BEARISH_ENGULFING',
      direction: 'SELL',
      candle: {
        timestamp: current.timestamp,
        open: current.open,
        high: current.high,
        low: current.low,
        close: current.close
      },
      swingBroken: latestSwingLow,
      adx: adx,
      reason: `Bearish engulfing broke swing low at ${latestSwingLow.price.toFixed(5)}, ADX=${adx.toFixed(1)}`
    };
  }

  /**
   * Main detection method - checks both directions
   */
  detect(candles, indicators) {
    const bullish = this.detectBullishEngulfing(candles, indicators);
    if (bullish) return bullish;

    const bearish = this.detectBearishEngulfing(candles, indicators);
    if (bearish) return bearish;

    return null;
  }
}

module.exports = EngulfingDetector;
