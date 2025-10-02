// backtesting/trade-simulator.js
class TradeSimulator {
  constructor(config = {}) {
    this.balance = config.startBalance || 10000;
    this.initialBalance = this.balance;
    this.riskPerTrade = config.riskPerTrade || 1;
  }

  /**
   * Execute a trade & simulate outcome
   * @param {Object} signal - Generated trading signal
   * @param {Object} entryCandle - Candle at signal time
   * @param {Array} futureCandles - Next N candles to check for SL/TP
   */
  executeTrade(signal, entryCandle, futureCandles) {
    const entry = signal.entry.price;
    const stopLoss = signal.exits.stopLoss;
    const takeProfit = signal.exits.takeProfit;
    const direction = signal.direction;

    let outcome = "PENDING";
    let exitPrice = null;
    let exitCandle = null;

    // Check SL/TP hit
    for (const candle of futureCandles) {
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

    // Timeout if no SL/TP hit
    if (outcome === "PENDING") {
      outcome = "TIMEOUT";
      exitPrice = futureCandles[futureCandles.length - 1].close;
      exitCandle = futureCandles[futureCandles.length - 1];
    }

    // Calculate P&L
    const riskAmount = this.balance * (this.riskPerTrade / 100);
    const rr = signal.risk.riskReward;
    const profitLoss = outcome === "WIN" ? riskAmount * rr : -riskAmount;

    this.balance += profitLoss;

    return {
      id: signal.id,
      direction,
      entryTime: entryCandle.time,
      entryPrice: entry,
      exitTime: exitCandle.time,
      exitPrice,
      stopLoss,
      takeProfit,
      outcome,
      pips: Number(((exitPrice - entry) * (direction === "BUY" ? 10000 : -10000)).toFixed(1)),
      profitLoss: Number(profitLoss.toFixed(2)),
      balanceAfter: Number(this.balance.toFixed(2)),
      riskReward: rr,
      quality: signal.quality.grade
    };
  }

  getBalance() {
    return this.balance;
  }

  getROI() {
    return ((this.balance - this.initialBalance) / this.initialBalance) * 100;
  }
}

module.exports = TradeSimulator;
