const SwingPipeline = require("./swing-pipeline");

const apiKey = "YOUR_ALPHA_VANTAGE_KEY"; // <-- yaha tumhara Alpha Vantage API key daalo
const swing = new SwingPipeline(apiKey);

(async () => {
  console.log("🚀 Phase 1 Step 4 Test Start...\n");

  // ✅ Fetch Daily Data
  console.log("▶ Fetching Daily Data (EUR/USD)...");
  const dailyData = await swing.getDailyData("EUR", "USD");

  if (dailyData.length > 0) {
    console.log("✅ Daily Data Loaded Successfully");
    console.log("📊 First 3 Daily Candles:", dailyData.slice(0, 3));
  } else {
    console.log("❌ Daily Data Fetch Failed");
  }

  console.log("\n--------------------------------\n");

  // ✅ Fetch Weekly Data
  console.log("▶ Fetching Weekly Data (EUR/USD)...");
  const weeklyData = await swing.getWeeklyData("EUR", "USD");

  if (weeklyData.length > 0) {
    console.log("✅ Weekly Data Loaded Successfully");
    console.log("📊 First 3 Weekly Candles:", weeklyData.slice(0, 3));
  } else {
    console.log("❌ Weekly Data Fetch Failed");
  }

  console.log("\n--------------------------------\n");

  // ✅ Combined Analysis Preview
  console.log("▶ Combined Analysis Preview");
  console.log({
    dailyCandles: dailyData.length,
    weeklyCandles: weeklyData.length,
    latestDaily: dailyData[0],
    latestWeekly: weeklyData[0],
  });

  console.log("\n🎯 Phase 1 Step 4 Test Completed!");
})();
