// trading-patterns/engulfing-detector.js
const SwingDetector = require('./swing-detector');

class EngulfingDetector {
  constructor() {
    this.swingDetector = new SwingDetector(10); // Relaxed from 20
  }

  detectBullishEngulfing(candles, indicators) {
    if (candles.length < 30) return null; // Relaxed from 50

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const adx = indicators.adx[indicators.adx.length - 1];

    if (previous.close >= previous.open) return null;
    if (current.close <= current.open) return null;

    const currentBodyEngulfs = 
      current.open < previous.close && 
      current.close > previous.open;

    if (!currentBodyEngulfs) return null;

    if (adx <= 15) return null; // Relaxed from 20

    const latestSwingHigh = this.swingDetector.getLatestSwingHigh(candles.slice(0, -1));
    
    if (!latestSwingHigh) return null;
    if (current.close <= latestSwingHigh.price) return null;

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

  detectBearishEngulfing(candles, indicators) {
    if (candles.length < 30) return null;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const adx = indicators.adx[indicators.adx.length - 1];

    if (previous.close <= previous.open) return null;
    if (current.close >= current.open) return null;

    const currentBodyEngulfs = 
      current.open > previous.close && 
      current.close < previous.open;

    if (!currentBodyEngulfs) return null;

    if (adx <= 15) return null; // Relaxed from 20

    const latestSwingLow = this.swingDetector.getLatestSwingLow(candles.slice(0, -1));
    
    if (!latestSwingLow) return null;
    if (current.close >= latestSwingLow.price) return null;

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

  detect(candles, indicators) {
    const bullish = this.detectBullishEngulfing(candles, indicators);
    if (bullish) return bullish;

    const bearish = this.detectBearishEngulfing(candles, indicators);
    if (bearish) return bearish;

    return null;
  }
}

module.exports = EngulfingDetector;
