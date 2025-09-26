const axios = require("axios");
const CacheManager = require("./cache-manager");
const RateLimiter = require("./rate-limiter");

class AlphaVantageAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://www.alphavantage.co/query";
  }

  // Daily Data
  async getDailyData(fromSymbol, toSymbol, outputSize = "compact") {
    const response = await axios.get(this.baseUrl, {
      params: {
        function: "FX_DAILY",
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        outputsize: outputSize,
        apikey: this.apiKey,
      },
    });
    return response.data;
  }

  // Weekly Data
  async getWeeklyData(fromSymbol, toSymbol) {
    const response = await axios.get(this.baseUrl, {
      params: {
        function: "FX_WEEKLY",
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        apikey: this.apiKey,
      },
    });
    return response.data;
  }
}

class SwingPipeline {
  constructor(apiKey) {
    this.api = new AlphaVantageAPI(apiKey);
    this.cache = new CacheManager();
    this.rateLimiter = new RateLimiter(5, 60000); // 5 calls/minute
  }

  // ✅ Daily Data with Cache + Rate Limiter
  async getDailyData(fromSymbol, toSymbol) {
    const cacheKey = `daily_${fromSymbol}_${toSymbol}`;

    // Check cache first
    let cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      console.log("📂 Loaded Daily Data from Cache");
      return cachedData;
    }

    // Wait if rate limit reached
    await this.rateLimiter.waitIfNeeded();

    const data = await this.api.getDailyData(fromSymbol, toSymbol, "full");

    if (data && data["Time Series FX (Daily)"]) {
      const timeSeries = data["Time Series FX (Daily)"];
      const formattedData = Object.keys(timeSeries).map((date) => ({
        date,
        open: parseFloat(timeSeries[date]["1. open"]),
        high: parseFloat(timeSeries[date]["2. high"]),
        low: parseFloat(timeSeries[date]["3. low"]),
        close: parseFloat(timeSeries[date]["4. close"]),
      }));

      // Save to cache for 60 sec
      this.cache.set(cacheKey, formattedData, 60);
      console.log("💾 Saved Daily Data to Cache");

      return formattedData;
    }

    return [];
  }

  // ✅ Weekly Data with Cache + Rate Limiter
  async getWeeklyData(fromSymbol, toSymbol) {
    const cacheKey = `weekly_${fromSymbol}_${toSymbol}`;

    let cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      console.log("📂 Loaded Weekly Data from Cache");
      return cachedData;
    }

    await this.rateLimiter.waitIfNeeded();

    const data = await this.api.getWeeklyData(fromSymbol, toSymbol);

    if (data && data["Weekly Time Series FX"]) {
      const timeSeries = data["Weekly Time Series FX"];
      const formattedData = Object.keys(timeSeries).map((date) => ({
        date,
        open: parseFloat(timeSeries[date]["1. open"]),
        high: parseFloat(timeSeries[date]["2. high"]),
        low: parseFloat(timeSeries[date]["3. low"]),
        close: parseFloat(timeSeries[date]["4. close"]),
      }));

      // Save to cache for 10 minutes
      this.cache.set(cacheKey, formattedData, 600);
      console.log("💾 Saved Weekly Data to Cache");

      return formattedData;
    }

    return [];
  }
}

module.exports = SwingPipeline;
