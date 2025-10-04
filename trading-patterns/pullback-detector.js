// trading-patterns/pullback-detector.js
class PullbackDetector {
  constructor() {
    this.tolerance = 0.001; // ±0.1% tolerance
  }

  /** Check if any candle touched the target level within tolerance */
  hasPriceTouchedLevel(candles, targetLevel, lookback = 10) {
    const recentCandles = candles.slice(-lookback);
    console.log(`  [DEBUG] Checking last ${lookback} candles for touch near ${targetLevel}`);

    for (const candle of recentCandles) {
      const upperBound = targetLevel * (1 + this.tolerance);
      const lowerBound = targetLevel * (1 - this.tolerance);

      console.log(
        `  [DEBUG] Candle ${candle.timestamp}: low=${candle.low}, high=${candle.high}, range=[${lowerBound.toFixed(
          5
        )}, ${upperBound.toFixed(5)}]`
      );

      if (candle.high >= lowerBound && candle.low <= upperBound) {
        console.log(`    ✓ Touch detected at ${candle.timestamp}`);
        return {
          touched: true,
          candle: candle,
          level: targetLevel,
        };
      }
    }

    console.log("  [DEBUG] No touch found in last candles");
    return { touched: false };
  }

  /** Detect higher low (for BUY setup) */
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

      console.log(
        `  [DEBUG] Candle ${i}: curr_low=${current.low.toFixed(
          5
        )}, prev_low=${previous.low.toFixed(5)}, curr_close=${current.close.toFixed(
          5
        )}, curr_open=${current.open.toFixed(5)}`
      );

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
        reason: `Higher low: ${current.low.toFixed(5)} > ${previous.low.toFixed(5)}`,
      };
    }

    console.log("  [DEBUG] No higher low found in lookback");
    return null;
  }

  /** Detect lower high (for SELL setup) */
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
        reason: `Lower high: ${current.high.toFixed(5)} < ${previous.high.toFixed(5)}`,
      };
    }

    return null;
  }

  /** Main function */
  isPullbackComplete(candles, engulfingLevel, direction, rsi) {
    if (candles.length < 10) return null;

    const touchResult = this.hasPriceTouchedLevel(candles, engulfingLevel, 10);
    if (!touchResult.touched) return null;

    if (rsi < 40 || rsi > 60) return null;

    if (direction === "BUY") {
      const higherLow = this.detectHigherLow(candles, 5);
      if (!higherLow) return null;

      return {
        complete: true,
        direction: "BUY",
        pattern: "HIGHER_LOW",
        touchPoint: touchResult,
        confirmationCandle: higherLow.candle,
        rsi,
        reason: `Pullback to ${engulfingLevel.toFixed(5)}, ${higherLow.reason}, RSI=${rsi.toFixed(1)}`,
      };
    } else if (direction === "SELL") {
      const lowerHigh = this.detectLowerHigh(candles, 5);
      if (!lowerHigh) return null;

      return {
        complete: true,
        direction: "SELL",
        pattern: "LOWER_HIGH",
        touchPoint: touchResult,
        confirmationCandle: lowerHigh.candle,
        rsi,
        reason: `Pullback to ${engulfingLevel.toFixed(5)}, ${lowerHigh.reason}, RSI=${rsi.toFixed(1)}`,
      };
    }

    return null;
  }
}

module.exports = PullbackDetector;
