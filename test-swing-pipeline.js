const axios = require("axios");
const ForexDataProcessor = require("./standardizer");

async function runPipeline() {
  console.log("📊 Fetching EUR/USD Daily Data...");

  const apiKey = "E391L86ZEMDYMFGP"; // tumhari API key
  try {
    // Fetch daily FX data
    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "FX_DAILY",
        from_symbol: "EUR",
        to_symbol: "USD",
        outputsize: "compact", // "full" agar pura historical data chahiye
        apikey: apiKey,
      },
    });

    const rawData = response.data;
    if (!rawData || !rawData["Time Series FX (Daily)"]) {
      console.error("❌ Error: No data returned from Alpha Vantage");
      return;
    }

    // Process with standardizer
    const cleanData = ForexDataProcessor.standardizeOHLCData(rawData, "Daily");

    console.log("✅ Standardized Data Sample:", cleanData.slice(-3)); // last 3 days
  } catch (err) {
    console.error("❌ Pipeline error:", err.message);
  }
}

runPipeline();
