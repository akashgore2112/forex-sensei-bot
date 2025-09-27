// test-swing-fetcher.js
const SwingDataFetcher = require("./swingDataFetcher");

async function testSwingFetcher() {
  console.log("🔍 Testing Swing Data Fetcher...");

  // Fetch EUR/USD daily candles
  const dailyData = await SwingDataFetcher.getDailyData("EUR/USD");
  console.log("📊 EUR/USD Daily Candles (last 3):", dailyData.slice(-3));

  // Fetch EUR/USD weekly candles
  const weeklyData = await SwingDataFetcher.getWeeklyData("EUR/USD");
  console.log("📊 EUR/USD Weekly Candles (last 3):", weeklyData.slice(-3));
}

testSwingFetcher();
