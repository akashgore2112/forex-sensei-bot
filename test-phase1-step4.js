// test-phase1-step4.js
const SwingPipeline = require("./swing-pipeline");

(async () => {
  console.log("\n🔎 Phase 1 Step 4 Test Start...\n");

  // ❌ apiKey yaha mat do, SwingPipeline internally apna AlphaVantage key use karta hai
  const swing = new SwingPipeline();

  // ---- Fetch Daily Data ----
  console.log("📈 Fetching Daily Data (EUR/USD)...");
  const dailyData = await swing.getDailyData("EUR/USD", "compact");

  if (dailyData && dailyData.length > 0) {
    console.log("✅ Daily Data Loaded Successfully");
    console.log("📊 First 3 Daily Candles:", dailyData.slice(0, 3));
  } else {
    console.log("❌ Daily Data Fetch Failed");
  }

  console.log("\n--------------------------------------\n");

  // ---- Fetch Weekly Data ----
  console.log("📈 Fetching Weekly Data (EUR/USD)...");
  const weeklyData = await swing.getWeeklyData("EUR/USD");

  if (weeklyData && weeklyData.length > 0) {
    console.log("✅ Weekly Data Loaded Successfully");
    console.log("📊 First 3 Weekly Candles:", weeklyData.slice(0, 3));
  } else {
    console.log("❌ Weekly Data Fetch Failed");
  }

  console.log("\n--------------------------------------\n");

  // ---- Run Full Pipeline ----
  console.log("⚙️ Running Full Swing Pipeline...");
  const pipelineResult = await swing.runPipeline("EUR/USD");

  if (pipelineResult) {
    console.log("✅ Pipeline Completed!");
    console.log("📊 Indicators:", pipelineResult.indicators);
  } else {
    console.log("❌ Pipeline Failed");
  }

  console.log("\n🎯 Phase 1 Step 4 Test Completed!\n");
})();
