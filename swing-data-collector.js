const axios = require("axios");

// 🔑 Apna Alpha Vantage API key yaha daalo
const API_KEY = "E391L86ZEMDYMFGP";
const BASE_URL = "https://www.alphavantage.co/query";

// Simple Rate Limiter (5 calls/minute)
class RateLimiter {
  constructor(maxCalls, timeWindow) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindow;
    this.calls = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    this.calls = this.calls.filter(t => now - t < this.timeWindow);

    if (this.calls.length >= this.maxCalls) {
      const waitTime = this.timeWindow - (now - this.calls[0]);
      console.log(`⏳ Rate limit hit. Waiting ${waitTime / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.calls.push(now);
  }
}

// Data Collector Class
class SwingDataCollector {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = BASE_URL;
    this.rateLimiter = new RateLimiter(5, 60000);
  }

  // Daily OHLCV Data
  async getDailyData(fromSymbol, toSymbol, outputSize = "full") {
    await this.rateLimiter.waitIfNeeded();

    const response = await axios.get(this.baseUrl, {
      params: {
        function: "FX_DAILY",
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        outputsize: outputSize, // 'full' => full historical data
        apikey: this.apiKey,
      },
    });

    return this.processData(response.data["Time Series FX (Daily)"]);
  }

  // Weekly OHLCV Data
  async getWeeklyData(fromSymbol, toSymbol) {
    await this.rateLimiter.waitIfNeeded();

    const response = await axios.get(this.baseUrl, {
      params: {
        function: "FX_WEEKLY",
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        apikey: this.apiKey,
      },
    });

    return this.processData(response.data["Time Series FX (Weekly)"]);
  }

  // Standardize OHLC data
  processData(rawData) {
    if (!rawData) {
      console.error("❌ No data received");
      return [];
    }

    return Object.entries(rawData).map(([date, values]) => ({
      date,
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
    }));
  }
}

// Quick Test
(async () => {
  const collector = new SwingDataCollector(API_KEY);

  console.log("📅 Fetching EUR/USD Daily Data...");
  const daily = await collector.getDailyData("EUR", "USD", "compact");
  console.log("✅ Latest Daily:", daily[0]);

  console.log("\n📅 Fetching EUR/USD Weekly Data...");
  const weekly = await collector.getWeeklyData("EUR", "USD");
  console.log("✅ Latest Weekly:", weekly[0]);
})();

module.exports = SwingDataCollector;
