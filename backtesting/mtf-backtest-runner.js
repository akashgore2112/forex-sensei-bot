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
    this.setupLog = {
      dailyBiasChanges: [],
      fourHSetups: [],
      oneHEntries: []
    };
  }

  /**
   * Main backtest execution
   * @param {Object} mtfData - Contains aligned daily, fourH, oneH candles
   */
  runBacktest(mtfData) {
    const { daily, fourH, oneH } = mtfData;
    
    console.log("\n=== Starting MTF Backtest ===");
    console.log(`Daily candles: ${daily.length}`);
    console.log(`4H candles: ${fourH.length}`);
    console.log(`1H candles: ${oneH.length}`);
    console.log("\nScanning each 1H candle...\n");

    let lastDailyBias = null;
    let setupCount = 0;
    let entryCount = 0;

    for (let i = 100; i < oneH.length; i++) {
      const currentTimestamp = oneH[i].timestamp;
      const alignedData = this.getAlignedData(daily, fourH, oneH, i);
      
      if (!alignedData.daily || alignedData.fourH.length < 50 || alignedData.oneH.length < 10) {
        continue;
      }

      const indicators = this.calculateIndicators(alignedData);
      const result = this.orchestrator.scanForSetup(alignedData, indicators);

      if (result.dailyBias.bias !== lastDailyBias) {
        this.logDailyBiasChange(currentTimestamp, lastDailyBias, result.dailyBias.bias);
        lastDailyBias = result.dailyBias.bias;
      }

      if (result.setup4H?.detected && !this.isSetupLogged(result.setup4H.timestamp)) {
        setupCount++;
        this.log4HSetup(setupCount, result.setup4H);
      }

      if (result.ready && result.entry1H?.entryReady) {
        entryCount++;
        this.executeEntry(entryCount, result, oneH, i);
      }
    }

    this.generateSummary();
    
    return {
      trades: this.trades,
      setupLog: this.setupLog,
      stats: this.calculateStats()
    };
  }

  getAlignedData(daily, fourH, oneH, currentIndex) {
    const currentTimestamp = oneH[currentIndex].timestamp;
    const currentTime = new Date(currentTimestamp).getTime();

    const currentDaily = daily.find(d => {
      const dDate = new Date(d.timestamp);
      const cDate = new Date(currentTimestamp);
      return dDate.toISOString().split('T')[0] === cDate.toISOString().split('T')[0];
    });

    const fourHFiltered = fourH.filter(c => new Date(c.timestamp).getTime() <= currentTime);
    const fourHSlice = fourHFiltered.slice(-50);

    const oneHSlice = oneH.slice(Math.max(0, currentIndex - 99), currentIndex + 1);

    return {
      daily: daily.slice(0, daily.indexOf(currentDaily) + 1),
      fourH: fourHSlice,
      oneH: oneHSlice
    };
  }

  calculateIndicators(alignedData) {
    return {
      dailyIndicators: {
        ema20: this.indicatorCalc.calculateEMA(alignedData.daily.map(c => c.close), 20),
        ema50: this.indicatorCalc.calculateEMA(alignedData.daily.map(c => c.close), 50)
      },
      fourHIndicators: {
        adx: this.indicatorCalc.calculateADX(alignedData.fourH, 14)
      },
      oneHIndicators: {
        rsi: this.indicatorCalc.calculateRSI(alignedData.oneH.map(c => c.close), 14),
        atr: this.indicatorCalc.calculateATR(alignedData.oneH, 14)
      }
    };
  }

  logDailyBiasChange(timestamp, oldBias, newBias) {
    const change = {
      timestamp,
      from: oldBias || 'NONE',
      to: newBias
    };
    this.setupLog.dailyBiasChanges.push(change);
    console.log(`[DAILY BIAS] ${change.from} → ${change.to} at ${timestamp}`);
  }

  log4HSetup(count, setup) {
    this.setupLog.fourHSetups.push({
      number: count,
      timestamp: setup.timestamp,
      direction: setup.direction,
      engulfingLevel: setup.engulfingLevel,
      adx: setup.adx
    });
    console.log(`\n--- 4H Setup #${count} ---`);
    console.log(`Time: ${setup.timestamp}`);
    console.log(`Direction: ${setup.direction}`);
    console.log(`Engulfing Level: ${setup.engulfingLevel.toFixed(5)}`);
    console.log(`ADX: ${setup.adx.toFixed(1)}`);
  }

  // ✅ Updated function as per your request
  executeEntry(count, result, oneHCandles, currentIndex) {
    const entry = result.entry1H;

    this.setupLog.oneHEntries.push({
      number: count,
      timestamp: entry.timestamp,
      direction: entry.direction,
      entry: entry.entry,
      stopLoss: entry.stopLoss,
      takeProfit: entry.takeProfit,
      riskReward: entry.riskReward
    });

    console.log(`\n=== ENTRY #${count} ===`);
    console.log(`Time: ${entry.timestamp}`);
    console.log(`Direction: ${entry.direction}`);
    console.log(`Entry: ${entry.entry}`);
    console.log(`SL: ${entry.stopLoss}`);
    console.log(`TP: ${entry.takeProfit}`);
    console.log(`R:R: ${entry.riskReward}:1`);

    const futureCandles = oneHCandles.slice(currentIndex + 1, currentIndex + 101);

    // ✅ Updated signal structure
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

  isSetupLogged(timestamp) {
    return this.setupLog.fourHSetups.some(s => s.timestamp === timestamp);
  }

  generateSummary() {
    console.log("\n\n========== BACKTEST SUMMARY ==========");
    console.log(`\nDaily Bias Changes: ${this.setupLog.dailyBiasChanges.length}`);
    console.log(`4H Setups Detected: ${this.setupLog.fourHSetups.length}`);
    console.log(`1H Entries Executed: ${this.setupLog.oneHEntries.length}`);
    console.log(`Trades Completed: ${this.trades.length}`);
  }

  calculateStats() {
    if (this.trades.length === 0) {
      return { message: "No trades executed" };
    }

    const wins = this.trades.filter(t => t.outcome === "WIN").length;
    const losses = this.trades.filter(t => t.outcome === "LOSS").length;
    const timeouts = this.trades.filter(t => t.outcome === "TIMEOUT").length;

    const totalPL = this.trades.reduce((sum, t) => sum + t.profitLoss, 0);
    const winRate = (wins / this.trades.length) * 100;

    return {
      totalTrades: this.trades.length,
      wins,
      losses,
      timeouts,
      winRate: winRate.toFixed(1),
      totalPL: totalPL.toFixed(2),
      finalBalance: this.tradeSimulator.getBalance().toFixed(2),
      roi: this.tradeSimulator.getROI().toFixed(2)
    };
  }
}

module.exports = MTFBacktestRunner;
