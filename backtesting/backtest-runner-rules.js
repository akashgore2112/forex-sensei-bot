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
        console.log(`Setup #${this.stats.setupsDetected}: ${setup.type} ${setup.direction} @ ${current.timestamp}`);

        // Convert setup to signal format for simulator
        const signal = {
          direction: setup.direction,
          entry: { price: setup.entry },
          exits: {
            stopLoss: setup.stopLoss,
            takeProfit: setup.takeProfit
          },
          risk: { riskReward: setup.riskReward },
          quality: { grade: "A" }
        };

        const trade = this.tradeSimulator.executeTrade(
          signal,
          current,
          historicalCandles.slice(i + 1, i + 20)
        );

        trades.push({ ...trade, setupType: setup.type });
      }

      if (i % 50 === 0) {
        console.log(`Progress: ${((i/historicalCandles.length)*100).toFixed(1)}%`);
      }
    }

    console.log(`\nTotal Windows: ${this.stats.totalWindows}`);
    console.log(`Setups Detected: ${this.stats.setupsDetected}`);
    console.log(`Trades Executed: ${trades.length}\n`);

    return trades;
  }
}

module.exports = RuleBasedBacktestRunner;
