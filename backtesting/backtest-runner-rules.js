// backtesting/backtest-runner-rules.js
const SwingIndicators = require("../swing-indicators");
const SetupDetector = require("../trading-setups/setup-detector");
const TradeSimulator = require("./trade-simulator");

class RuleBasedBacktestRunner {
  constructor(config = {}) {
    this.startBalance = config.startBalance || 10000;
    this.riskPerTrade = config.riskPerTrade || 1;
    this.tradeSimulator = new TradeSimulator({
      startBalance: this.startBalance,
      riskPerTrade: this.riskPerTrade
    });
    this.setupDetector = new SetupDetector();
    this.stats = { totalWindows: 0, setupsDetected: 0 };
  }

  calculateMTFABias(candles, indicators) {
    const ema20 = indicators.ema20[indicators.ema20.length - 1];
    const ema50 = indicators.ema50[indicators.ema50.length - 1];
    
    let bias = "NEUTRAL";
    if (ema20 > ema50 * 1.001) bias = "BULLISH";
    else if (ema20 < ema50 * 0.999) bias = "BEARISH";

    return {
      dailyCandles: candles,
      biases: { daily: bias, weekly: bias, monthly: bias },
      overallBias: bias,
      confidence: 75
    };
  }

  async runBacktest(historicalCandles) {
    console.log("\n=== RULE-BASED BACKTEST ===");
    console.log(`Candles: ${historicalCandles.length}`);
    console.log(`Balance: $${this.startBalance}\n`);

    const trades = [];
    const windowSize = 100;

    for (let i = windowSize; i < historicalCandles.length; i++) {
      this.stats.totalWindows++;
      
      const window = historicalCandles.slice(i - windowSize, i + 1);
      const current = window[window.length - 1];

      const indicators = await SwingIndicators.calculateAll(window);
      const mtfa = this.calculateMTFABias(window, indicators);
      
      const setup = this.setupDetector.detectAll(window, indicators, mtfa);

      if (setup) {
        this.stats.setupsDetected++;
        
        // Detailed logging
        console.log(`\n--- Setup #${this.stats.setupsDetected} ---`);
        console.log(`Date: ${current.timestamp}`);
        console.log(`Type: ${setup.type}`);
        console.log(`Signal: ${setup.direction}`);
        console.log(`Reason: ${setup.reason}`);
        console.log(`Entry: ${setup.entry.toFixed(5)} | SL: ${setup.stopLoss.toFixed(5)} | TP: ${setup.takeProfit.toFixed(5)}`);
        console.log(`R:R = ${setup.riskReward}:1`);

        const signal = {
          direction: setup.direction,
          entry: { price: setup.entry },
          exits: {
            stopLoss: setup.stopLoss,
            takeProfit: setup.takeProfit
          },
          risk: { riskReward: setup.riskReward },
          quality: { grade: "A" },
          id: `SETUP-${this.stats.setupsDetected}`
        };

        const trade = this.tradeSimulator.executeTrade(
          signal,
          current,
          historicalCandles.slice(i + 1, i + 20)
        );

        // ✅ Filter out invalid/null trades
        if (trade) {
          console.log(`Result: ${trade.outcome} | P/L: $${trade.profitLoss}`);
          trades.push({ ...trade, setupType: setup.type, setupReason: setup.reason });
        } else {
          console.log(`Skipped - insufficient future data`);
        }
      }

      if (i % 50 === 0) {
        console.log(`Progress: ${((i/historicalCandles.length)*100).toFixed(1)}%`);
      }
    }

    console.log(`\nTotal Windows: ${this.stats.totalWindows}`);
    console.log(`Setups Detected: ${this.stats.setupsDetected}`);
    console.log(`Trades Executed: ${trades.length}`);

    return trades;
  }
}

module.exports = RuleBasedBacktestRunner;
