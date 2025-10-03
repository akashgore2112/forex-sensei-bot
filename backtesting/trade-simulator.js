// backtesting/trade-simulator.js
class TradeSimulator {
  constructor(config = {}) {
    this.balance = config.startBalance || 10000;
    this.initialBalance = this.balance;
    this.riskPerTrade = config.riskPerTrade || 1;
    this.tradeCount = 0;
  }

  executeTrade(signal, entryCandle, futureCandles) {
    this.tradeCount++;
    
    const entry = signal.entry.price;
    const stopLoss = signal.exits.stopLoss;
    const takeProfit = signal.exits.takeProfit;
    const direction = signal.direction;

    // DEBUG: Log first 3 trades
    if (this.tradeCount <= 3) {
      console.log(`\n🔍 TRADE #${this.tradeCount} DEBUG:`);
      console.log(`   Direction: ${direction}`);
      console.log(`   Entry: ${entry.toFixed(5)}`);
      console.log(`   SL: ${stopLoss.toFixed(5)}`);
      console.log(`   TP: ${takeProfit.toFixed(5)}`);
      console.log(`   Entry Candle Close: ${entryCandle.close.toFixed(5)}`);
      console.log(`   Next Candle: High=${futureCandles[0].high.toFixed(5)} Low=${futureCandles[0].low.toFixed(5)}`);
    }

    let outcome = "PENDING";
    let exitPrice = null;
    let exitCandle = null;

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

    if (outcome === "PENDING") {
      outcome = "TIMEOUT";
      exitPrice = futureCandles[futureCandles.length - 1].close;
      exitCandle = futureCandles[futureCandles.length - 1];
    }

    const riskAmount = this.balance * (this.riskPerTrade / 100);
    const rr = signal.risk.riskReward;
    const profitLoss = outcome === "WIN" ? riskAmount * rr : -riskAmount;

    this.balance += profitLoss;

    // DEBUG: Log outcome of first 3 trades
    if (this.tradeCount <= 3) {
      console.log(`   Outcome: ${outcome}`);
      console.log(`   Exit: ${exitPrice.toFixed(5)}\n`);
    }

    return {
      id: signal.id,
      direction,
      entryTime: entryCandle.timestamp || entryCandle.time,  // FIXED: use timestamp
      entryPrice: entry,
      exitTime: exitCandle ? (exitCandle.timestamp || exitCandle.time) : null,  // FIXED
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
