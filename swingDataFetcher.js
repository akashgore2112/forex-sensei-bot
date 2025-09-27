// swingDataFetcher.js
const AlphaVantageAPI = require("./alphatest");
const ForexDataProcessor = require("./standardizer");
const CacheManager = require("./cache-manager");
const RateLimiter = require("./rateLimiter");

const api = new AlphaVantageAPI("E391L86ZEMDYMFGP"); // 👈 Tumhari API key
const cache = new CacheManager();
const limiter = new RateLimiter(5, 60000);

class SwingDataFetcher {
  static async getDailyData(pair) {
    const cacheKey = `${pair}_DAILY`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`📦 Loaded from cache: ${cacheKey}`);
      return cached;
    }

    // Otherwise fetch new data
    await limiter.waitIfNeeded();
    const data = await api.getDailyData(pair.split("/")[0], pair.split("/")[1], "full");
    const standardized = ForexDataProcessor.standardizeOHLCData(data, "DAILY");

    // Save in cache
    cache.set(cacheKey, standardized, 1440); // 1440 min = 24 hrs
    console.log(`💾 Cached new data for: ${cacheKey}`);

    return standardized;
  }

  static async getWeeklyData(pair) {
    const cacheKey = `${pair}_WEEKLY`;

    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`📦 Loaded from cache: ${cacheKey}`);
      return cached;
    }

    await limiter.waitIfNeeded();
    const data = await api.getWeeklyData(pair.split("/")[0], pair.split("/")[1]);
    const standardized = ForexDataProcessor.standardizeOHLCData(data, "WEEKLY");

    cache.set(cacheKey, standardized, 10080); // 7 days
    console.log(`💾 Cached new data for: ${cacheKey}`);

    return standardized;
  }
}

module.exports = SwingDataFetcher;
