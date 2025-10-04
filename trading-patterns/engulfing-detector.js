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
    if (candles.length < 50) {
      console.log("  [DEBUG] Not enough candles");
      return null;
    }

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const adx = indicators.adx[indicators.adx.length - 1];

    console.log(`  [DEBUG] Previous: open=${previous.open} close=${previous.close} (bearish=${previous.close < previous.open})`);
    console.log(`  [DEBUG] Current: open=${current.open} close=${current.close} (bullish=${current.close > current.open})`);

    if (previous.close >= previous.open) {
      console.log("  [DEBUG] Failed: Previous not bearish");
      return null;
    }

    if (current.close <= current.open) {
      console.log("  [DEBUG] Failed: Current not bullish");
      return null;
    }

    const currentBodyEngulfs =
      current.open < previous.close &&
      current.close > previous.open;

    console.log(`  [DEBUG] Engulfs check: ${current.open} < ${previous.close} AND ${current.close} > ${previous.open} = ${currentBodyEngulfs}`);

    if (!currentBodyEngulfs) {
      console.log("  [DEBUG] Failed: Body doesn't engulf");
      return null;
    }

    console.log(`  [DEBUG] ADX: ${adx}`);
    if (adx <= 20) {
      console.log("  [DEBUG] Failed: ADX too low");
      return null;
    }

    const latestSwingHigh = this.swingDetector.getLatestSwingHigh(candles.slice(0, -1));

    console.log(`  [DEBUG] Swing high: ${latestSwingHigh ? latestSwingHigh.price : 'NONE'}`);

    if (!latestSwingHigh) {
      console.log("  [DEBUG] Failed: No swing high found");
      return null;
    }

    console.log(`  [DEBUG] Close vs swing: ${current.close} > ${latestSwingHigh.price} = ${current.close > latestSwingHigh.price}`);

    if (current.close <= latestSwingHigh.price) {
      console.log("  [DEBUG] Failed: Doesn't break swing");
      return null;
    }

    console.log("  [DEBUG] All checks passed!");
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
    if (candles.length < 50) {
      console.log("  [DEBUG] Not enough candles");
      return null;
    }

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const adx = indicators.adx[indicators.adx.length - 1];

    console.log(`  [DEBUG] Previous: open=${previous.open} close=${previous.close} (bullish=${previous.close > previous.open})`);
    console.log(`  [DEBUG] Current: open=${current.open} close=${current.close} (bearish=${current.close < current.open})`);

    if (previous.close <= previous.open) {
      console.log("  [DEBUG] Failed: Previous not bullish");
      return null;
    }

    if (current.close >= current.open) {
      console.log("  [DEBUG] Failed: Current not bearish");
      return null;
    }

    const currentBodyEngulfs =
      current.open > previous.close &&
      current.close < previous.open;

    console.log(`  [DEBUG] Engulfs check: ${current.open} > ${previous.close} AND ${current.close} < ${previous.open} = ${currentBodyEngulfs}`);

    if (!currentBodyEngulfs) {
      console.log("  [DEBUG] Failed: Body doesn't engulf");
      return null;
    }

    console.log(`  [DEBUG] ADX: ${adx}`);
    if (adx <= 20) {
      console.log("  [DEBUG] Failed: ADX too low");
      return null;
    }

    const latestSwingLow = this.swingDetector.getLatestSwingLow(candles.slice(0, -1));
    console.log(`  [DEBUG] Swing low: ${latestSwingLow ? latestSwingLow.price : 'NONE'}`);

    if (!latestSwingLow) {
      console.log("  [DEBUG] Failed: No swing low found");
      return null;
    }

    console.log(`  [DEBUG] Close vs swing: ${current.close} < ${latestSwingLow.price} = ${current.close < latestSwingLow.price}`);

    if (current.close >= latestSwingLow.price) {
      console.log("  [DEBUG] Failed: Doesn't break swing");
      return null;
    }

    console.log("  [DEBUG] All checks passed!");
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
