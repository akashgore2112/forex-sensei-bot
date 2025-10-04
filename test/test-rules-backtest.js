// test/test-rules-backtest.js
const HistoricalDataFetcher = require("../backtesting/historical-data-fetcher");
const RuleBasedBacktestRunner = require("../backtesting/backtest-runner-rules");
const BacktestReporter = require("../backtesting/backtest-reporter");

async function runRulesBacktest() {
  console.log("PHASE 1: RULE-BASED SYSTEM TEST\n");

  const dataFetcher = new HistoricalDataFetcher();
  const data = await dataFetcher.fetchData("EUR/USD", 2);

  const runner = new RuleBasedBacktestRunner({
    startBalance: 10000,
    riskPerTrade: 1
  });

  const trades = await runner.runBacktest(data);

  const reporter = new BacktestReporter();
  const report = reporter.generateReport(trades, 10000);
  
  // Export to JSON
  reporter.exportJSON(report, "phase1-results.json");
}

runRulesBacktest().catch(console.error);
