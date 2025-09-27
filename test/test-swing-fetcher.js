// test-swing-fetcher.js
const SwingDataFetcher = require("../swingDataFetcher");

async function testSwingFetcher() {
  console.log("🔍 Testing Swing Data Fetcher...");

  try {
    // Fetch EUR/USD daily candles
    const dailyData = await SwingDataFetcher.getDailyData("EUR/USD");
    if (dailyData && dailyData.length > 0) {
      console.log(`✅ EUR/USD Daily Candles Fetched! Total: ${dailyData.length}`);
      console.log("📊 Last 3 Daily Candles:", dailyData.slice(-3));
    } else {
      console.warn("⚠️ No Daily Data returned for EUR/USD.");
    }

    // Fetch EUR/USD weekly candles
    const weeklyData = await SwingDataFetcher.getWeeklyData("EUR/USD");
    if (weeklyData && weeklyData.length > 0) {
      console.log(`✅ EUR/USD Weekly Candles Fetched! Total: ${weeklyData.length}`);
      console.log("📊 Last 3 Weekly Candles:", weeklyData.slice(-3));
    } else {
      console.warn("⚠️ No Weekly Data returned for EUR/USD.");
    }

    // ✅ Fetch EUR/USD monthly candles
    const monthlyData = await SwingDataFetcher.getMonthlyData("EUR/USD");
    if (monthlyData && monthlyData.length > 0) {
      console.log(`✅ EUR/USD Monthly Candles Fetched! Total: ${monthlyData.length}`);
      console.log("📊 Last 3 Monthly Candles:", monthlyData.slice(-3));
    } else {
      console.warn("⚠️ No Monthly Data returned for EUR/USD.");
    }

  } catch (err) {
    console.error("❌ Error while testing SwingDataFetcher:", err.message);
    console.error(err); // full error stack for debugging
  }
}

testSwingFetcher();
