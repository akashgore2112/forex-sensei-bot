// backtesting/mean-reversion-backtest.js
const MeanReversionDetector = require('../strategies/mean-reversion-detector');
const IndicatorCalculator = require('./indicator-calculator');
const TradeSimulator = require('./trade-simulator');

class MeanReversionBacktest {
  constructor(config = {}) {
    this.detector = new MeanReversionDetector();
    this.indicatorCalc = new IndicatorCalculator();
    this.tradeSimulator = new TradeSimulator(config);
    
    this.trades = [];
    this.setupLog = [];
  }

  runBacktest(fourH, oneH) {
    console.log("\n=== Mean Reversion Backtest ===");
    console.log(`4H candles: ${fourH.length}`);
    console.log(`1H candles: ${oneH.length}`);
    console.log("\nScanning for RSI extremes at S/R levels...\n");

    let setupCount = 0;

    for (let i = 100; i < oneH.length; i++) {
      const alignedData = this.getAlignedData(fourH, oneH, i);
      
      if (alignedData.fourH.length < 20 || alignedData.oneH.length < 30) {
        continue;
      }

      const indicators1H = this.calculateIndicators(alignedData.oneH);
      
      // Add ADX to 1H indicators
      indicators1H.adx = this.indicatorCalc.calculateADX(alignedData.oneH, 14);

      const setup = this.detector.scan(
        alignedData.fourH,
        alignedData.oneH,
        indicators1H
      );

      if (setup.detected) {
        setupCount++;
        this.logSetup(setupCount, setup);
        this.executeEntry(setupCount, setup, oneH, i);
      }
    }

    this.generateSummary();

    return {
      trades: this.trades,
      setupLog: this.setupLog,
      stats: this.calculateStats()
    };
  }

  getAlignedData(fourH, oneH, currentIndex) {
    const currentTimestamp = oneH[currentIndex].timestamp;
    const currentTime = new Date(currentTimestamp).getTime();

    const fourHFiltered = fourH.filter(c => 
      new Date(c.timestamp).getTime() <= currentTime
    );
    const fourHSlice = fourHFiltered.slice(-50);

    const oneHSlice = oneH.slice(Math.max(0, currentIndex - 99), currentIndex + 1);

    return {
      fourH: fourHSlice,
      oneH: oneHSlice
    };
  }

  calculateIndicators(candles) {
    return {
      rsi: this.indicatorCalc.calculateRSI(candles.map(c => c.close), 14),
      atr: this.indicatorCalc.calculateATR(candles, 14)
    };
  }

  logSetup(count, setup) {
    this.setupLog.push({
      number: count,
      timestamp: setup.candle.timestamp,
      direction: setup.direction,
      type: setup.type,
      rsi: setup.rsi,
      adx: setup.adx,
      level: setup.level.price,
      touches: setup.level.touches
    });

    console.log(`\n--- Setup #${count} ---`);
    console.log(`Time: ${setup.candle.timestamp}`);
    console.log(`Type: ${setup.type}`);
    console.log(`Direction: ${setup.direction}`);
    console.log(`RSI: ${setup.rsi}`);
    console.log(`ADX: ${setup.adx} (ranging)`);
    console.log(`S/R Level: ${setup.level.price.toFixed(5)} (${setup.level.touches} touches)`);
    console.log(`Distance: ${setup.distance}`);
  }

  executeEntry(count, setup, oneHCandles, currentIndex) {
    const trade = this.detector.calculateTrade(setup);

    console.log(`\n=== ENTRY #${count} ===`);
    console.log(`Entry: ${trade.entry}`);
    console.log(`SL: ${trade.stopLoss}`);
    console.log(`TP: ${trade.takeProfit}`);
    console.log(`R:R: ${trade.riskReward}:1`);

    const futureCandles = oneHCandles.slice(currentIndex + 1, currentIndex + 25); // 24 hour max hold

    const tradeSignal = {
      id: count,
      direction: setup.direction,
      entry: { price: trade.entry },
      exits: {
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit
      },
      risk: { riskReward: trade.riskReward }
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
    console.log("\n\n========== BACKTEST SUMMARY ==========");
    console.log(`Setups detected: ${this.setupLog.length}`);
    console.log(`Trades executed: ${this.trades.length}`);
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

    const buyTrades = this.trades.filter(t => t.direction === "BUY").length;
    const sellTrades = this.trades.filter(t => t.direction === "SELL").length;

    return {
      totalTrades: this.trades.length,
      wins,
      losses,
      timeouts,
      winRate: winRate.toFixed(1),
      totalPL: totalPL.toFixed(2),
      finalBalance: this.tradeSimulator.getBalance().toFixed(2),
      roi: this.tradeSimulator.getROI().toFixed(2),
      buyTrades,
      sellTrades
    };
  }
}

module.exports = MeanReversionBacktest;
