const SwingDataFetcher = require("../swingDataFetcher");

async function testMultiTimeframeCache() {
  console.log("🔍 Testing Multi-Timeframe Cache...");

  // Step 1: Fetch Daily
  const daily = await SwingDataFetcher.getDailyData("EUR/USD");
  console.log(`✅ Daily Candles: ${daily.length}`);

  // Step 2: Fetch Weekly
  const weekly = await SwingDataFetcher.getWeeklyData("EUR/USD");
  console.log(`✅ Weekly Candles: ${weekly.length}`);

  // Step 3: Fetch Monthly
  const monthly = await SwingDataFetcher.getMonthlyData("EUR/USD");
  console.log(`✅ Monthly Candles: ${monthly.length}`);

  console.log("\n📂 Now re-fetching to confirm cache HIT...\n");

  // Repeat fetch (should come from cache this time)
  await SwingDataFetcher.getDailyData("EUR/USD");
  await SwingDataFetcher.getWeeklyData("EUR/USD");
  await SwingDataFetcher.getMonthlyData("EUR/USD");

  console.log("\n✅ Multi-timeframe cache test completed!");
}

testMultiTimeframeCache();
