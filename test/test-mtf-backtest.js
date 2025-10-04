// test/test-mtf-backtest.js
const HistoricalDataFetcher = require('../backtesting/historical-data-fetcher');
const IntradayDataFetcher = require('../backtesting/intraday-data-fetcher');
const MTFBacktestRunner = require('../backtesting/mtf-backtest-runner');

async function runFullBacktest() {
  console.log("=== Phase 5.1: Full MTF Backtest ===\n");

  try {
    // Load all timeframe data
    console.log("Loading data from cache...\n");
    
    const dailyFetcher = new HistoricalDataFetcher();
    const intradayFetcher = new IntradayDataFetcher();

    const dailyData = await dailyFetcher.fetchData("EUR/USD", 2);
    const fourHData = await intradayFetcher.fetch4HData("EUR/USD");
    const oneHData = await intradayFetcher.fetch1HData("EUR/USD");

    console.log(`\nData loaded:`);
    console.log(`  Daily: ${dailyData.length} candles`);
    console.log(`  4H: ${fourHData.length} candles`);
    console.log(`  1H: ${oneHData.length} candles`);

    // Find overlap period
    const dailyStart = new Date(dailyData[0].timestamp);
    const dailyEnd = new Date(dailyData[dailyData.length - 1].timestamp);
    const fourHStart = new Date(fourHData[0].timestamp);
    const fourHEnd = new Date(fourHData[fourHData.length - 1].timestamp);
    const oneHStart = new Date(oneHData[0].timestamp);
    const oneHEnd = new Date(oneHData[oneHData.length - 1].timestamp);

    console.log(`\nDate ranges:`);
    console.log(`  Daily: ${dailyStart.toISOString().split('T')[0]} to ${dailyEnd.toISOString().split('T')[0]}`);
    console.log(`  4H: ${fourHStart.toISOString().split('T')[0]} to ${fourHEnd.toISOString().split('T')[0]}`);
    console.log(`  1H: ${oneHStart.toISOString().split('T')[0]} to ${oneHEnd.toISOString().split('T')[0]}`);

    // Use overlap period (latest start to earliest end)
    const backTestStart = new Date(Math.max(dailyStart, fourHStart, oneHStart));
    const backTestEnd = new Date(Math.min(dailyEnd, fourHEnd, oneHEnd));

    console.log(`\nBacktest window: ${backTestStart.toISOString().split('T')[0]} to ${backTestEnd.toISOString().split('T')[0]}`);

    // Filter data to overlap period
    const filteredDaily = dailyData.filter(c => {
      const t = new Date(c.timestamp);
      return t >= backTestStart && t <= backTestEnd;
    });

    const filteredFourH = fourHData.filter(c => {
      const t = new Date(c.timestamp);
      return t >= backTestStart && t <= backTestEnd;
    });

    const filteredOneH = oneHData.filter(c => {
      const t = new Date(c.timestamp);
      return t >= backTestStart && t <= backTestEnd;
    });

    console.log(`\nFiltered data for backtest:`);
    console.log(`  Daily: ${filteredDaily.length} candles`);
    console.log(`  4H: ${filteredFourH.length} candles`);
    console.log(`  1H: ${filteredOneH.length} candles`);

    // Run backtest
    console.log("\nInitializing backtest runner...");
    
    const runner = new MTFBacktestRunner({
      startBalance: 10000,
      riskPerTrade: 1 // 1% risk per trade
    });

    const results = runner.runBacktest({
      daily: filteredDaily,
      fourH: filteredFourH,
      oneH: filteredOneH
    });

    // Display final statistics
    console.log("\n\n========== FINAL STATISTICS ==========");
    const stats = results.stats;
    
    if (stats.message) {
      console.log(stats.message);
    } else {
      console.log(`\nTotal Trades: ${stats.totalTrades}`);
      console.log(`Wins: ${stats.wins} | Losses: ${stats.losses} | Timeouts: ${stats.timeouts}`);
      console.log(`Win Rate: ${stats.winRate}%`);
      console.log(`\nStarting Balance: $10,000`);
      console.log(`Final Balance: $${stats.finalBalance}`);
      console.log(`Total P/L: $${stats.totalPL}`);
      console.log(`ROI: ${stats.roi}%`);

      console.log(`\n--- Cascade Breakdown ---`);
      console.log(`Daily Bias Changes: ${results.setupLog.dailyBiasChanges.length}`);
      console.log(`4H Setups Detected: ${results.setupLog.fourHSetups.length}`);
      console.log(`1H Entries Executed: ${results.setupLog.oneHEntries.length}`);
      console.log(`Trades Completed: ${stats.totalTrades}`);

      // Conversion rates
      if (results.setupLog.fourHSetups.length > 0) {
        const setupToEntry = (results.setupLog.oneHEntries.length / results.setupLog.fourHSetups.length * 100).toFixed(1);
        console.log(`\n4H Setup → 1H Entry Rate: ${setupToEntry}%`);
      }
    }

    console.log("\n=== Backtest Complete ===\n");

  } catch (error) {
    console.error("Backtest error:", error.message);
    console.error(error.stack);
  }
}

runFullBacktest();
