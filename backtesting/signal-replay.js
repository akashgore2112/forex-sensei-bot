// backtesting/signal-replay.js
/**
 * Purpose: Replay generated signals on historical data step by step
 * to verify correctness of entries/exits during backtest.
 */
class SignalReplay {
  /**
   * Replay a signal on historical candles
   * @param {Object} signal - Trading signal from generator
   * @param {Array} candles - Historical candles after signal time
   * @param {Number} maxBars - Max bars to simulate forward
   * @returns {Object} Replay result
   */
  replay(signal, candles, maxBars = 20) {
    console.log("\n🔄 Replaying signal...");

    if (signal.direction === "NO_SIGNAL") {
      return { outcome: "SKIPPED", details: "No signal generated" };
    }

    const entry = signal.entry.price;
    const stopLoss = signal.exits.stopLoss;
    const takeProfit = signal.exits.takeProfit;
    const direction = signal.direction;

    let outcome = "PENDING";
    let exitPrice = null;
    let exitCandle = null;

    for (let i = 0; i < Math.min(candles.length, maxBars); i++) {
      const candle = candles[i];

      if (direction === "BUY") {
        if (candle.low <= stopLoss) {
          outcome = "LOSS";
          exitPrice = stopLoss;
          exitCandle = candle;
          break;
        }
        if (candle.high >= takeProfit) {
          outcome = "WIN";
          exitPrice = takeProfit;
          exitCandle = candle;
          break;
        }
      } else if (direction === "SELL") {
        if (candle.high >= stopLoss) {
          outcome = "LOSS";
          exitPrice = stopLoss;
          exitCandle = candle;
          break;
        }
        if (candle.low <= takeProfit) {
          outcome = "WIN";
          exitPrice = takeProfit;
          exitCandle = candle;
          break;
        }
      }
    }

    if (outcome === "PENDING") {
      outcome = "TIMEOUT";
      exitCandle = candles[Math.min(maxBars, candles.length) - 1];
      exitPrice = exitCandle.close;
    }

    return {
      outcome,
      entry,
      stopLoss,
      takeProfit,
      exitPrice,
      exitTime: exitCandle ? exitCandle.time : null
    };
  }
}

module.exports = SignalReplay;
