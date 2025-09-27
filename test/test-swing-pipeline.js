const axios = require("axios");
const ForexDataProcessor = require("./standardizer");

// ✅ API Key
const API_KEY = "E391L86ZEMDYMFGP";

// ✅ Base URL
const BASE_URL = "https://www.alphavantage.co/query";

// ✅ Fetch Daily Data (EUR/USD)
async function fetchDailyData() {
  try {
    console.log("\n📡 Fetching EUR/USD Daily Data...");
    const response = await axios.get(BASE_URL, {
      params: {
        function: "FX_DAILY",
        from_symbol: "EUR",
        to_symbol: "USD",
        outputsize: "compact", // change to 'full' if needed
        apikey: API_KEY,
      },
    });

    console.log("\n🔍 Raw API Response Keys:", Object.keys(response.data));

    // Debug print full response (comment this out later)
    console.log("\n📝 Raw Response Sample:", JSON.stringify(response.data).slice(0, 500), "...");

    const standardized = ForexDataProcessor.standardizeOHLCData(
      response.data,
      "DAILY"
    );

    console.log("\n✅ Standardized Daily Data Sample:", standardized.slice(-5)); // last 5 entries
  } catch (err) {
    console.error("❌ Error fetching daily data:", err.message);
  }
}

// ✅ Fetch Weekly Data (EUR/USD)
async function fetchWeeklyData() {
  try {
    console.log("\n📡 Fetching EUR/USD Weekly Data...");
    const response = await axios.get(BASE_URL, {
      params: {
        function: "FX_WEEKLY",
        from_symbol: "EUR",
        to_symbol: "USD",
        apikey: API_KEY,
      },
    });

    console.log("\n🔍 Raw API Response Keys:", Object.keys(response.data));

    // Debug print full response (comment this out later)
    console.log("\n📝 Raw Response Sample:", JSON.stringify(response.data).slice(0, 500), "...");

    const standardized = ForexDataProcessor.standardizeOHLCData(
      response.data,
      "WEEKLY"
    );

    console.log("\n✅ Standardized Weekly Data Sample:", standardized.slice(-5));
  } catch (err) {
    console.error("❌ Error fetching weekly data:", err.message);
  }
}

// ✅ Main Runner
(async () => {
  console.log("🚀 Testing Swing Pipeline...\n");

  await fetchDailyData();
  await fetchWeeklyData();

  console.log("\n🎯 Test Completed!");
})();
