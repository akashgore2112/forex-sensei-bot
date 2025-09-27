// swingDataFetcher.js
const AlphaVantageAPI = require("./alphatest");
const ForexDataProcessor = require("./standardizer");
const CacheManager = require("./cache-manager");
const RateLimiter = require("./rate-limiter");

const api = new AlphaVantageAPI("E391L86ZEMDYMFGP"); // 👈 Tumhari API key
const cache = new CacheManager();
const limiter = new RateLimiter(5, 60000);

class SwingDataFetcher {
  // ✅ Fetch Daily Data
  static async getDailyData(pair) {
    try {
      const cacheKey = `${pair}_DAILY`;

      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`📦 Loaded from cache: ${cacheKey}`);
        return cached;
      }

      await limiter.waitIfNeeded();
      const data = await api.getDailyData(pair.split("/")[0], pair.split("/")[1], "full");
      const standardized = ForexDataProcessor.standardizeOHLCData(data, "DAILY");

      if (standardized.length > 0) {
        cache.set(cacheKey, standardized, 1440); // 1 day
        console.log(`💾 Cached new data for: ${cacheKey}`);
      } else {
        console.warn(`⚠️ No standardized daily data found for ${pair}`);
      }

      return standardized;
    } catch (err) {
      console.error(`❌ Error fetching DAILY data for ${pair}:`, err.message);
      return [];
    }
  }

  // ✅ Fetch Weekly Data
  static async getWeeklyData(pair) {
    try {
      const cacheKey = `${pair}_WEEKLY`;

      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`📦 Loaded from cache: ${cacheKey}`);
        return cached;
      }

      await limiter.waitIfNeeded();
      const data = await api.getWeeklyData(pair.split("/")[0], pair.split("/")[1]);
      const standardized = ForexDataProcessor.standardizeOHLCData(data, "WEEKLY");

      if (standardized.length > 0) {
        cache.set(cacheKey, standardized, 10080); // 7 days
        console.log(`💾 Cached new data for: ${cacheKey}`);
      } else {
        console.warn(`⚠️ No standardized weekly data found for ${pair}`);
      }

      return standardized;
    } catch (err) {
      console.error(`❌ Error fetching WEEKLY data for ${pair}:`, err.message);
      return [];
    }
  }

  // ✅ Fetch Monthly Data (NEW)
  static async getMonthlyData(pair) {
    try {
      const cacheKey = `${pair}_MONTHLY`;

      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`📦 Loaded from cache: ${cacheKey}`);
        return cached;
      }

      await limiter.waitIfNeeded();
      const data = await api.getMonthlyData(pair.split("/")[0], pair.split("/")[1]);
      const standardized = ForexDataProcessor.standardizeOHLCData(data, "MONTHLY");

      if (standardized.length > 0) {
        cache.set(cacheKey, standardized, 43200); // 30 days
        console.log(`💾 Cached new data for: ${cacheKey}`);
      } else {
        console.warn(`⚠️ No standardized monthly data found for ${pair}`);
      }

      return standardized;
    } catch (err) {
      console.error(`❌ Error fetching MONTHLY data for ${pair}:`, err.message);
      return [];
    }
  }
}

module.exports = SwingDataFetcher;
