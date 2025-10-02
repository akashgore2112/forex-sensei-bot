// test/test-backtest.js
const HistoricalDataFetcher = require("../backtesting/historical-data-fetcher");
const DataValidator = require("../backtesting/data-validator");
const BacktestRunner = require("../backtesting/backtest-runner");
const PerformanceCalculator = require("../backtesting/performance-calculator");
const TradeAnalyzer = require("../backtesting/trade-analyzer");
const ReportGenerator = require("../backtesting/report-generator");

require("dotenv").config();

async function testBacktest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   PHASE 7 TEST - BACKTESTING SYSTEM");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // 🔹 Step 19: Fetch historical data
    const dataFetcher = new HistoricalDataFetcher();
    const historicalData = await dataFetcher.fetchData("EUR/USD", 2);

    const validator = new DataValidator();
    const validation = validator.validate(historicalData);

    if (!validation.valid) {
      console.log("⚠️  Data quality issues detected, but continuing...");
    }

    // 🔹 Step 20: Run backtest
    const backtester = new BacktestRunner({
      startBalance: 10000,
      riskPerTrade: 1,
      useAIValidation: false // Fast backtest (no GPT-4 calls)
    });

    const trades = await backtester.runBacktest(historicalData);

    // 🔹 Step 21: Performance Analytics
    const perfCalc = new PerformanceCalculator();
    const metrics = perfCalc.calculate(trades, 10000);

    const analyzer = new TradeAnalyzer();
    const tradeInsights = analyzer.analyze(trades);

    const reportGen = new ReportGenerator();
    const report = reportGen.generate(metrics, trades, tradeInsights);

    console.log("✅ Backtest Complete!");
    console.log(`Recommendation: ${report.recommendation}`);

    return { success: true, report };
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
