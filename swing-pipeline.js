const axios = require("axios");
const ForexDataProcessor = require("./standardizer");

class SwingPipeline {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://www.alphavantage.co/query";

    // ✅ Simple in-memory cache
    this.cache = {
      store: {},
      get(key) {
        return this.store[key];
      },
      set(key, value) {
        this.store[key] = value;
      },
    };
  }

  // ✅ Fetch Daily Data
  async getDailyData(fromSymbol, toSymbol, outputSize = "compact") {
    const cacheKey = `DAILY_${fromSymbol}_${toSymbol}`;
    let data = this.cache.get(cacheKey);

    if (!data) {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: "FX_DAILY",
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          outputsize: outputSize,
          apikey: this.apiKey,
        },
      });

      data = ForexDataProcessor.standardizeOHLCData(
        response.data,
        "Daily"
      );
      this.cache.set(cacheKey, data);
    }

    return data;
  }

  // ✅ Fetch Weekly Data
  async getWeeklyData(fromSymbol, toSymbol) {
    const cacheKey = `WEEKLY_${fromSymbol}_${toSymbol}`;
    let data = this.cache.get(cacheKey);

    if (!data) {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: "FX_WEEKLY",
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          apikey: this.apiKey,
        },
      });

      data = ForexDataProcessor.standardizeOHLCData(
        response.data,
        "Weekly"
      );
      this.cache.set(cacheKey, data);
    }

    return data;
  }
}

module.exports = SwingPipeline;
