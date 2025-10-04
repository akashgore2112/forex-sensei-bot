// trading-patterns/pullback-detector.js
class PullbackDetector {
  constructor() {
    this.tolerance = 0.001; // ±0.1%
  }

  hasPriceTouchedLevel(candles, targetLevel, lookback = 10) {
    const recentCandles = candles.slice(-lookback);

    for (const candle of recentCandles) {
      const upperBound = targetLevel * (1 + this.tolerance);
      const lowerBound = targetLevel * (1 - this.tolerance);

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

  detectHigherLow(candles, lookback = 5) {
    if (candles.length < lookback + 1) {
      console.log("  [DEBUG] Not enough candles for higher low detection");
      return null;
    }

    const recent = candles.slice(-lookback);
    console.log(`  [DEBUG] Checking last ${lookback} candles for higher low`);

    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];

      console.log(`  [DEBUG] Candle ${i}: curr_low=${current.low.toFixed(5)}, prev_low=${previous.low.toFixed(5)}, curr_close=${current.close.toFixed(5)}, curr_open=${current.open.toFixed(5)}`);

      if (current.low <= previous.low) {
        console.log(`    ✗ Low not higher`);
        continue;
      }
      console.log(`    ✓ Low is higher`);

      if (current.close <= current.open) {
        console.log(`    ✗ Candle not bullish`);
        continue;
      }
      console.log(`    ✓ Candle is bullish - FOUND HIGHER LOW`);

      return {
        found: true,
        candle: current,
        previousLow: previous.low,
        currentLow: current.low,
        reason: `Higher low: ${current.low.toFixed(5)} > ${previous.low.toFixed(5)}`
      };
    }

    console.log("  [DEBUG] No higher low found in lookback");
    return null;
  }

  detectLowerHigh(candles, lookback = 5) {
    if (candles.length < lookback + 1) return null;

    const recent = candles.slice(-lookback);

    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];

      if (current.high >= previous.high) continue;
      if (current.close >= current.open) continue;

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

  isPullbackComplete(candles, engulfingLevel, direction, rsi) {
    console.log(`\n[PULLBACK CHECK] Direction: ${direction}, Level: ${engulfingLevel.toFixed(5)}, RSI: ${rsi}`);
    
    if (candles.length < 10) {
      console.log("  [DEBUG] Not enough candles");
      return null;
    }

    // Rule 1: Price touched the engulfing level
    console.log("  [DEBUG] Checking if price touched level...");
    const touchResult = this.hasPriceTouchedLevel(candles, engulfingLevel, 10);
    
    if (!touchResult.touched) {
      console.log("  [DEBUG] ✗ Price never touched level");
      return null;
    }
    console.log(`  [DEBUG] ✓ Price touched at ${touchResult.candle.timestamp}`);

    // Rule 2: RSI between 40-60
    console.log(`  [DEBUG] Checking RSI: ${rsi} (need 40-60)`);
    if (rsi < 40 || rsi > 60) {
      console.log("  [DEBUG] ✗ RSI outside range");
      return null;
    }
    console.log("  [DEBUG] ✓ RSI in range");

    // Rule 3: Higher low (BUY) or lower high (SELL)
    if (direction === "BUY") {
      console.log("  [DEBUG] Looking for higher low...");
      const higherLow = this.detectHigherLow(candles, 5);
      if (!higherLow) {
        console.log("  [DEBUG] ✗ No higher low found");
        return null;
      }

      console.log("  [DEBUG] ✓ PULLBACK COMPLETE");
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
      console.log("  [DEBUG] Looking for lower high...");
      const lowerHigh = this.detectLowerHigh(candles, 5);
      if (!lowerHigh) {
        console.log("  [DEBUG] ✗ No lower high found");
        return null;
      }

      console.log("  [DEBUG] ✓ PULLBACK COMPLETE");
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
