// backtesting/mtf-backtest-runner.js
const MTFSetupOrchestrator = require('../mtf-setups/mtf-setup-orchestrator');
const IndicatorCalculator = require('./indicator-calculator');
const TradeSimulator = require('./trade-simulator');

class MTFBacktestRunner {
  constructor(config = {}) {
    this.orchestrator = new MTFSetupOrchestrator();
    this.indicatorCalc = new IndicatorCalculator();
    this.tradeSimulator = new TradeSimulator(config);

    this.trades = [];
  }

  // ✅ Updated indicator calculation (4H trend + 1H pin bar)
  calculateIndicators(alignedData) {
    return {
      fourHIndicators: {
        ema20: this.indicatorCalc.calculateEMA(alignedData.fourH.map(c => c.close), 20),
        ema50: this.indicatorCalc.calculateEMA(alignedData.fourH.map(c => c.close), 50),
        adx: this.indicatorCalc.calculateADX(alignedData.fourH, 14)
      },
      oneHIndicators: {
        rsi: this.indicatorCalc.calculateRSI(alignedData.oneH.map(c => c.close), 14),
        atr: this.indicatorCalc.calculateATR(alignedData.oneH, 14)
      }
    };
  }

  // ✅ Updated – removed daily timeframe
  getAlignedData(daily, fourH, oneH, currentIndex) {
    const currentTimestamp = oneH[currentIndex].timestamp;
    const currentTime = new Date(currentTimestamp).getTime();

    // Get last 50 4H candles
    const fourHFiltered = fourH.filter(c => new Date(c.timestamp).getTime() <= currentTime);
    const fourHSlice = fourHFiltered.slice(-50);

    // Get last 100 1H candles
    const oneHSlice = oneH.slice(Math.max(0, currentIndex - 99), currentIndex + 1);

    return {
      fourH: fourHSlice,
      oneH: oneHSlice
    };
  }

  // ✅ Updated runBacktest to use only 4H + 1H
  runBacktest(mtfData) {
    const { fourH, oneH } = mtfData; // Removed daily

    console.log("\n=== Starting MTF Backtest (4H Trend + 1H Pin Bar) ===");
    console.log(`4H candles: ${fourH.length}`);
    console.log(`1H candles: ${oneH.length}`);
    console.log("\nScanning each 1H candle...\n");

    let entryCount = 0;

    for (let i = 100; i < oneH.length; i++) {
      const alignedData = this.getAlignedData(null, fourH, oneH, i);

      if (alignedData.fourH.length < 50 || alignedData.oneH.length < 30) {
        continue;
      }

      const indicators = this.calculateIndicators(alignedData);
      const result = this.orchestrator.scanForSetup(alignedData, indicators);

      if (result.ready && result.entry1H?.entryReady) {
        entryCount++;
        this.executeEntry(entryCount, result, oneH, i);
      }
    }

    this.generateSummary();

    return {
      trades: this.trades,
      stats: this.calculateStats()
    };
  }

  // ✅ Updated to new structure (entry1H)
  executeEntry(count, result, oneHCandles, currentIndex) {
    const entry = result.entry1H;

    console.log(`\n=== ENTRY #${count} ===`);
    console.log(`Time: ${entry.timestamp}`);
    console.log(`Direction: ${entry.direction}`);
    console.log(`Pattern: ${entry.pattern}`);
    console.log(`Entry: ${entry.entry}`);
    console.log(`SL: ${entry.stopLoss}`);
    console.log(`TP: ${entry.takeProfit}`);
    console.log(`R:R: ${entry.riskReward}:1`);

    const futureCandles = oneHCandles.slice(currentIndex + 1, currentIndex + 101);

    const tradeSignal = {
      id: count,
      direction: entry.direction,
      entry: { price: entry.entry },
      exits: {
        stopLoss: entry.stopLoss,
        takeProfit: entry.takeProfit
      },
      risk: { riskReward: entry.riskReward }
    };

    const tradeResult = this.tradeSimulator.executeTrade(
      tradeSignal,
      oneHCandles[currentIndex],
      futureCandles
    );

    if (tradeResult) {
      this.trades.push(tradeResult);
      console.log(`Result: ${tradeResult.outcome} | P/L: $${tradeResult.profitLoss}`);
    }
  }

  generateSummary() {
    console.log("\n========== BACKTEST SUMMARY ==========");
    console.log(`Trades executed: ${this.trades.length}`);
  }

  calculateStats() {
    if (this.trades.length === 0) {
      return { message: "No trades executed" };
    }

    const wins = this.trades.filter(t => t.outcome === "WIN").length;
    const losses = this.trades.filter(t => t.outcome === "LOSS").length;
    const totalPL = this.trades.reduce((sum, t) => sum + t.profitLoss, 0);
    const winRate = (wins / this.trades.length) * 100;

    return {
      totalTrades: this.trades.length,
      wins,
      losses,
      winRate: winRate.toFixed(1),
      totalPL: totalPL.toFixed(2),
      finalBalance: this.tradeSimulator.getBalance().toFixed(2),
      roi: this.tradeSimulator.getROI().toFixed(2)
    };
  }
}

module.exports = MTFBacktestRunner;
