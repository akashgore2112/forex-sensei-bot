// test/test-backtest.js
const HistoricalDataFetcher = require("../backtesting/historical-data-fetcher");
const DataValidator = require("../backtesting/data-validator");
const BacktestRunner = require("../backtesting/backtest-runner");
const PerformanceCalculator = require("../backtesting/performance-calculator");
const ReportGenerator = require("../backtesting/report-generator");
require("dotenv").config();

async function testBacktest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   PHASE 7 TEST - BACKTESTING SYSTEM");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Fetch historical data
    const dataFetcher = new HistoricalDataFetcher();
    const historicalData = await dataFetcher.fetchData("EUR/USD", 2);

    console.log("\n📊 DATA SUMMARY:");
    console.log(`Total candles fetched: ${historicalData.length}`);
    console.log(`Date range: ${historicalData[0].timestamp} to ${historicalData[historicalData.length-1].timestamp}`);
    console.log(`Rolling windows: ${Math.max(0, historicalData.length - 100)}\n`);

    if (historicalData.length < 100) {
      throw new Error("Not enough historical data (need 100+ candles)");
    }

    const validator = new DataValidator();
    const validation = validator.validate(historicalData);

    if (!validation.valid) {
      console.log("⚠️ Data quality issues detected, but continuing...\n");
    }

    // Run backtest with debug logging
    const backtester = new BacktestRunner({
      startBalance: 10000,
      riskPerTrade: 1,
      useAIValidation: false
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   STARTING BACKTEST LOOP");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const trades = await backtester.runBacktest(historicalData);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   BACKTEST STATISTICS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Calculate performance
    const perfCalc = new PerformanceCalculator();
    const metrics = perfCalc.calculate(trades, 10000);

    const reportGen = new ReportGenerator();
    const report = reportGen.generate(metrics, trades);

    console.log(`Recommendation: ${report.recommendation}\n`);

    return { success: true, report, trades };

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testBacktest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = testBacktest;
