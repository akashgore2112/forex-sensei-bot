const axios = require("axios");
const ForexDataProcessor = require("./standardizer");

class SwingPipeline {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://www.alphavantage.co/query";
  }

  // Daily OHLC data fetch
  async getDailyData(fromSymbol, toSymbol, outputSize = "compact") {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: "FX_DAILY",
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          outputsize: outputSize, // "full" if more history needed
          apikey: this.apiKey,
        },
      });

      if (!response.data || !response.data["Time Series FX (Daily)"]) {
        console.error("❌ No Daily Data received");
        return [];
      }

      return ForexDataProcessor.standardizeOHLCData(
        response.data,
        "Daily"
      );
    } catch (error) {
      console.error("❌ Error fetching Daily Data:", error.message);
      return [];
    }
  }

  // Weekly OHLC data fetch
  async getWeeklyData(fromSymbol, toSymbol) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: "FX_WEEKLY",
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          apikey: this.apiKey,
        },
      });

      if (!response.data || !response.data["Time Series FX (Weekly)"]) {
        console.error("❌ No Weekly Data received");
        return [];
      }

      return ForexDataProcessor.standardizeOHLCData(
        response.data,
        "Weekly"
      );
    } catch (error) {
      console.error("❌ Error fetching Weekly Data:", error.message);
      return [];
    }
  }
}

// -------------------
// Run pipeline test
// -------------------
(async () => {
  const apiKey = "E391L86ZEMDYMFGP"; // tumhari API key
  const pipeline = new SwingPipeline(apiKey);

  console.log("📊 Fetching EUR/USD Daily Data...");
  const dailyData = await pipeline.getDailyData("EUR", "USD", "compact");
  console.log("✅ Daily Data Sample:", dailyData.slice(-3));

  console.log("\n📊 Fetching EUR/USD Weekly Data...");
  const weeklyData = await pipeline.getWeeklyData("EUR", "USD");
  console.log("✅ Weekly Data Sample:", weeklyData.slice(-3));
})();
