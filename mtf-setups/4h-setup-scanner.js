// mtf-setups/4h-setup-scanner.js
const PinBarDetector = require('../trading-patterns/pinbar-detector');

class FourHourSetupScanner {
  constructor() {
    this.pinBarDetector = new PinBarDetector();
  }

  scanForSetup(candles4H, indicators4H, dailyBias) {
    // Rule 1: Daily bias must be valid
    if (!dailyBias.valid || dailyBias.bias === "NEUTRAL") {
      return this.getNoSetup("Daily bias is NEUTRAL or invalid");
    }

    if (!candles4H || candles4H.length < 30) {
      return this.getNoSetup("Insufficient 4H candles");
    }

    // Rule 2: Detect pin bar pattern
    const pinBar = this.pinBarDetector.detect(candles4H, indicators4H);

    if (!pinBar) {
      return this.getNoSetup("No pin bar pattern detected on 4H");
    }

    // Rule 3: Pin bar direction must match daily bias
    const dailyDirection = dailyBias.bias === "BULLISH" ? "BUY" : "SELL";

    if (pinBar.direction !== dailyDirection) {
      return this.getNoSetup(
        `Pin bar ${pinBar.direction} conflicts with daily bias ${dailyBias.bias}`
      );
    }

    // All conditions met
    const setupLevel = this.getSetupLevel(pinBar);

    return {
      detected: true,
      direction: pinBar.direction,
      setupCandle: pinBar.candle,
      engulfingLevel: setupLevel, // Keep same property name for compatibility
      swingPoint: pinBar.swingPoint,
      adx: pinBar.adx,
      dailyBias: dailyBias.bias,
      patternType: pinBar.type,
      wickRatio: pinBar.ratio,
      reason: `${pinBar.type} aligned with ${dailyBias.bias} daily bias. ${pinBar.reason}`,
      timestamp: pinBar.candle.timestamp
    };
  }

  getSetupLevel(pinBar) {
    // For pullback: price should return to pin bar entry
    if (pinBar.direction === "BUY") {
      return pinBar.candle.low; // Pullback to hammer low
    } else {
      return pinBar.candle.high; // Pullback to shooting star high
    }
  }

  getNoSetup(reason) {
    return {
      detected: false,
      direction: null,
      setupCandle: null,
      engulfingLevel: null,
      swingPoint: null,
      adx: null,
      dailyBias: null,
      patternType: null,
      wickRatio: null,
      reason: reason,
      timestamp: null
    };
  }
}

module.exports = FourHourSetupScanner;
