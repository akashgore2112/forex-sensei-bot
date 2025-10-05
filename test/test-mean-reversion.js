// test/test-mean-reversion.js
const IntradayDataFetcher = require('../backtesting/intraday-data-fetcher');
const MeanReversionBacktest = require('../backtesting/mean-reversion-backtest');

async function runMeanReversionTest() {
  console.log("=== Mean Reversion Strategy Backtest ===\n");

  try {
    console.log("Loading data from cache...\n");
    
    const intradayFetcher = new IntradayDataFetcher();
    const fourHData = await intradayFetcher.fetch4HData("EUR/USD");
    const oneHData = await intradayFetcher.fetch1HData("EUR/USD");

    console.log(`Data loaded:`);
    console.log(`  4H: ${fourHData.length} candles`);
    console.log(`  1H: ${oneHData.length} candles`);

    const fourHStart = new Date(fourHData[0].timestamp);
    const fourHEnd = new Date(fourHData[fourHData.length - 1].timestamp);
    const oneHStart = new Date(oneHData[0].timestamp);
    const oneHEnd = new Date(oneHData[oneHData.length - 1].timestamp);

    console.log(`\nDate ranges:`);
    console.log(`  4H: ${fourHStart.toISOString().split('T')[0]} to ${fourHEnd.toISOString().split('T')[0]}`);
    console.log(`  1H: ${oneHStart.toISOString().split('T')[0]} to ${oneHEnd.toISOString().split('T')[0]}`);

    const backTestStart = new Date(Math.max(fourHStart, oneHStart));
    const backTestEnd = new Date(Math.min(fourHEnd, oneHEnd));

    console.log(`\nBacktest window: ${backTestStart.toISOString().split('T')[0]} to ${backTestEnd.toISOString().split('T')[0]}`);

    const filteredFourH = fourHData.filter(c => {
      const t = new Date(c.timestamp);
      return t >= backTestStart && t <= backTestEnd;
    });

    const filteredOneH = oneHData.filter(c => {
      const t = new Date(c.timestamp);
      return t >= backTestStart && t <= backTestEnd;
    });

    console.log(`\nFiltered data:`);
    console.log(`  4H: ${filteredFourH.length} candles`);
    console.log(`  1H: ${filteredOneH.length} candles`);

    const backtest = new MeanReversionBacktest({
      startBalance: 10000,
      riskPerTrade: 1
    });

    const results = backtest.runBacktest(filteredFourH, filteredOneH);

    console.log("\n\n========== FINAL STATISTICS ==========");
    const stats = results.stats;
    
    if (stats.message) {
      console.log(stats.message);
    } else {
      console.log(`\nTotal Trades: ${stats.totalTrades}`);
      console.log(`Wins: ${stats.wins} | Losses: ${stats.losses} | Timeouts: ${stats.timeouts}`);
      console.log(`Win Rate: ${stats.winRate}%`);
      console.log(`Direction Distribution: ${stats.buyTrades} BUY / ${stats.sellTrades} SELL`);
      console.log(`\nStarting Balance: $10,000`);
      console.log(`Final Balance: $${stats.finalBalance}`);
      console.log(`Total P/L: $${stats.totalPL}`);
      console.log(`ROI: ${stats.roi}%`);
    }

    console.log("\n=== Backtest Complete ===\n");

  } catch (error) {
    console.error("Backtest error:", error.message);
    console.error(error.stack);
  }
}

runMeanReversionTest();
