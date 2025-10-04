// backtesting/intraday-data-fetcher.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class IntradayDataFetcher {
  constructor() {
    this.apiKey = 'b5a7ca32025f4166a6c2e5381d64b242'; // TwelveData API key
    this.baseUrl = 'https://api.twelvedata.com/time_series';
    this.cacheDir = path.join(__dirname, '../cache');

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // Generic fetcher for any timeframe
  async fetchData(symbol = "EUR/USD", interval = "1h") {
    const cacheFile = path.join(
      this.cacheDir,
      `${symbol.replace('/', '_')}_${interval}.json`
    );

    // Step 1: Check cache (valid for 24 hours)
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();

      if (cacheAge < 24 * 60 * 60 * 1000) {
        console.log(`Using cached ${interval} data (${cached.data.length} candles)`);
        return cached.data;
      }
    }

    // Step 2: Fetch from TwelveData API
    console.log(`Fetching ${interval} data for ${symbol} from Twelve Data...`);

    const params = {
      symbol: symbol,
      interval: interval,
      outputsize: 5000,
      apikey: this.apiKey,
      format: 'JSON'
    };

    const response = await axios.get(this.baseUrl, { params });

    if (response.data.status === "error") {
      throw new Error(`Twelve Data error: ${response.data.message}`);
    }

    const data = response.data.values;
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid data format returned from Twelve Data API");
    }

    // Step 3: Convert to candle format (sorted oldest → newest)
    const candles = data.map(entry => ({
      timestamp: new Date(entry.datetime).toISOString(),
      open: parseFloat(entry.open),
      high: parseFloat(entry.high),
      low: parseFloat(entry.low),
      close: parseFloat(entry.close),
      volume: parseFloat(entry.volume || 0)
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Step 4: Save to cache
    fs.writeFileSync(cacheFile, JSON.stringify({
      symbol,
      interval,
      fetchedAt: new Date().toISOString(),
      data: candles
    }, null, 2));

    console.log(`Fetched and cached ${candles.length} candles (${interval})`);
    return candles;
  }

  // Shortcut for 4H
  async fetch4HData(symbol = "EUR/USD") {
    return this.fetchData(symbol, "4h");
  }

  // Shortcut for 1H
  async fetch1HData(symbol = "EUR/USD") {
    return this.fetchData(symbol, "1h");
  }
}

module.exports = IntradayDataFetcher;
