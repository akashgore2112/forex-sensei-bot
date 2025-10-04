// backtesting/intraday-data-fetcher.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

class IntradayDataFetcher {
  constructor() {
    this.apiKey = "b5a7ca32025f4166a6c2e5381d64b242"; // TwelveData API Key
    this.baseUrl = "https://api.twelvedata.com/time_series";
    this.cacheDir = path.join(__dirname, "../cache");

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // ✅ Generic fetch function
  async fetchData(symbol = "EUR/USD", interval = "1h", months = 6) {
    const cacheFile = path.join(this.cacheDir, `${symbol.replace("/", "_")}_${interval}.json`);

    // Use cache if available and fresh (< 24h)
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();

      if (cacheAge < 24 * 60 * 60 * 1000) {
        console.log(`✅ Using cached ${interval} data (${cached.data.length} candles)`);
        return cached.data;
      }
    }

    console.log(`📡 Fetching ${interval} data for ${symbol} from TwelveData...`);

    try {
      const url = `${this.baseUrl}?symbol=${symbol.replace("/", "/")}&interval=${interval}&apikey=${this.apiKey}&outputsize=5000&format=JSON`;
      const response = await axios.get(url);

      if (response.data.status === "error") {
        throw new Error(`TwelveData Error: ${response.data.message}`);
      }

      if (!response.data.values) {
        throw new Error(`No ${interval} data returned for ${symbol}`);
      }

      const candles = response.data.values
        .map((item) => ({
          timestamp: new Date(item.datetime).toISOString(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: item.volume ? parseFloat(item.volume) : 0,
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Cache result
      fs.writeFileSync(
        cacheFile,
        JSON.stringify(
          {
            symbol,
            interval,
            fetchedAt: new Date().toISOString(),
            data: candles,
          },
          null,
          2
        )
      );

      console.log(`✅ Saved ${candles.length} ${interval} candles to cache`);
      return candles;
    } catch (err) {
      console.error(`❌ Error fetching ${interval} data: ${err.message}`);
      if (fs.existsSync(cacheFile)) {
        console.log("⚠️ Using older cached data due to fetch failure.");
        return JSON.parse(fs.readFileSync(cacheFile, "utf8")).data;
      }
      throw err;
    }
  }

  // ✅ Fetch 4H data
  async fetch4HData(symbol = "EUR/USD", months = 6) {
    return this.fetchData(symbol, "4h", months);
  }

  // ✅ Fetch 1H data
  async fetch1HData(symbol = "EUR/USD", months = 6) {
    return this.fetchData(symbol, "1h", months);
  }
}

module.exports = IntradayDataFetcher;
