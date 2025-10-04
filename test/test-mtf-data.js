// test/test-mtf-data.js
const HistoricalDataFetcher = require('../backtesting/historical-data-fetcher');
const IntradayDataFetcher = require('../backtesting/intraday-data-fetcher');
const MTFDataManager = require('../backtesting/mtf-data-manager');

async function testDataFetch() {
  console.log("=== Phase 1 Test: Multi-Timeframe Data Fetch ===\n");

  // Fetch all timeframes
  const dailyFetcher = new HistoricalDataFetcher();
  const intradayFetcher = new IntradayDataFetcher();

  console.log("1. Fetching Daily data...");
  const dailyData = await dailyFetcher.fetchData("EUR/USD", 2);

  console.log("\n2. Fetching 4H data...");
  const fourHData = await intradayFetcher.fetch4HData("EUR/USD");

  console.log("\n3. Fetching 1H data...");
  const oneHData = await intradayFetcher.fetch1HData("EUR/USD");

  console.log("\n4. Creating MTF Data Manager...");
  const mtfManager = new MTFDataManager(dailyData, fourHData, oneHData);

  // Test alignment at specific point
  console.log("\n5. Testing data alignment...");
  const testTimestamp = oneHData[Math.floor(oneHData.length / 2)].timestamp;
  const aligned = mtfManager.getAlignedData(testTimestamp);

  console.log(`\nAt timestamp: ${testTimestamp}`);
  console.log(`  Daily candle: ${aligned.daily ? aligned.daily.close.toFixed(5) : 'NOT FOUND'}`);
  console.log(`  4H candles available: ${aligned.fourH.length}`);
  console.log(`  1H candles available: ${aligned.oneH.length}`);

  if (aligned.fourH.length > 0) {
    console.log(`  Latest 4H close: ${aligned.fourH[aligned.fourH.length - 1].close.toFixed(5)}`);
  }

  if (aligned.oneH.length > 0) {
    console.log(`  Latest 1H close: ${aligned.oneH[aligned.oneH.length - 1].close.toFixed(5)}`);
  }

  console.log("\n=== Phase 1 Test Complete ===");
  console.log("\nReview:");
  console.log("- Are all 3 timeframes fetched successfully?");
  console.log("- Do the candle counts look reasonable?");
  console.log("- Is alignment working (all 3 timeframes return data)?");
}

testDataFetch().catch(console.error);
