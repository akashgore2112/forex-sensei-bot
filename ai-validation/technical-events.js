// ai-validation/technical-events.js

class TechnicalEvents {
  /**
   * Detect recent technical events
   * @param {Array} candles - OHLCV data
   * @param {Object} indicators - technical indicators
   * @returns {Array} list of detected events
   */
  detect(candles, indicators) {
    const events = [];
    if (!candles || candles.length < 20) return events;

    const current = candles[candles.length - 1];
    const recent = candles.slice(-10);

    // Support / Resistance tests
    events.push(...this.detectSRTests(current, indicators));

    // Breakouts
    events.push(...this.detectBreakouts(recent));

    // EMA crosses
    events.push(...this.detectEMACrosses(indicators));

    // Volume spikes
    events.push(...this.detectVolumeSpikes(candles));

    return events.filter(e => e !== null);
  }

  /**
   * Detect support and resistance tests
   */
  detectSRTests(current, indicators) {
    const events = [];
    if (!indicators || !indicators.supportResistance) return events;

    const sr = indicators.supportResistance;

    // Nearest support test
    if (sr.support && sr.support.length > 0) {
      const nearestSupport = sr.support[0];
      const distance = Math.abs(current.close - nearestSupport.level) / current.close;
      if (distance < 0.002) { // within 0.2%
        events.push("Testing support level");
      }
    }

    // Nearest resistance test
    if (sr.resistance && sr.resistance.length > 0) {
      const nearestResistance = sr.resistance[0];
      const distance = Math.abs(current.close - nearestResistance.level) / current.close;
      if (distance < 0.002) {
        events.push("Testing resistance level");
      }
    }

    return events;
  }

  /**
   * Detect bullish/bearish breakouts
   */
  detectBreakouts(candles) {
    const events = [];
    if (candles.length < 5) return events;

    const current = candles[candles.length - 1];
    const previous = candles.slice(0, -1);

    const prevHigh = Math.max(...previous.map(c => c.high));
    const prevLow = Math.min(...previous.map(c => c.low));

    if (current.close > prevHigh * 1.001) {
      events.push("Bullish breakout detected");
    }
    if (current.close < prevLow * 0.999) {
      events.push("Bearish breakdown detected");
    }

    return events;
  }

  /**
   * Detect EMA20/EMA50 crosses
   */
  detectEMACrosses(indicators) {
    const events = [];
    if (!indicators || !indicators.ema20 || !indicators.ema50) return events;

    const ema20 = indicators.ema20.slice(-2);
    const ema50 = indicators.ema50.slice(-2);

    if (ema20.length < 2 || ema50.length < 2) return events;

    const prev20 = ema20[0].value || ema20[0];
    const curr20 = ema20[1].value || ema20[1];
    const prev50 = ema50[0].value || ema50[0];
    const curr50 = ema50[1].value || ema50[1];

    // Golden Cross
    if (prev20 < prev50 && curr20 > curr50) {
      events.push("Golden Cross (EMA20 above EMA50)");
    }

    // Death Cross
    if (prev20 > prev50 && curr20 < curr50) {
      events.push("Death Cross (EMA20 below EMA50)");
    }

    return events;
  }

  /**
   * Detect unusual volume spikes
   */
  detectVolumeSpikes(candles) {
    const events = [];
    const recent = candles.slice(-20).map(c => c.volume || 0);

    if (recent.length === 0) return events;

    const avgVolume = recent.reduce((a, b) => a + b, 0) / recent.length;
    const current = candles[candles.length - 1];

    if ((current.volume || 0) > avgVolume * 2) {
      events.push("Unusual volume spike detected");
    }

    return events;
  }
}

module.exports = TechnicalEvents;
