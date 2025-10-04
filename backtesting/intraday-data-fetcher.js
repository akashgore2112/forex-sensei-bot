// backtesting/intraday-data-fetcher.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class IntradayDataFetcher {
  constructor() {
    this.apiKey = 'YOUR_REAL_API_KEY';
    this.cacheDir = path.join(__dirname, '../cache');

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // 🔹 Fetch 1H data directly from Alpha Vantage
  async fetch1HData(symbol = "EUR/USD") {
    const cacheFile = path.join(this.cacheDir, `${symbol.replace('/', '_')}_1H.json`);

    // ✅ Use cache if recent
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) {
        console.log(`Using cached 1H data (${cached.data.length} candles)`);
        return cached.data;
      }
    }

    console.log(`Fetching 1H data for ${symbol}...`);

    const [fromCurrency, toCurrency] = symbol.split('/');
    const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=60min&outputsize=full&apikey=${this.apiKey}`;

    const response = await axios.get(url);

    if (response.data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${response.data['Error Message']}`);
    }

    if (response.data['Note']) {
      throw new Error('API rate limit reached. Wait 1 minute.');
    }

    const timeSeries = response.data['Time Series FX (60min)'];
    if (!timeSeries) {
      throw new Error('No 1H data returned');
    }

    const candles = Object.entries(timeSeries)
      .map(([timestamp, values]) => ({
        timestamp: new Date(timestamp).toISOString(),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: 0,
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    fs.writeFileSync(
      cacheFile,
      JSON.stringify({ symbol, interval: '1H', fetchedAt: new Date().toISOString(), data: candles }, null, 2)
    );

    console.log(`Fetched ${candles.length} 1H candles`);
    return candles;
  }

  // 🔹 Aggregate 1H data to 4H candles
  async fetch4HData(symbol = "EUR/USD") {
    const cacheFile = path.join(this.cacheDir, `${symbol.replace('/', '_')}_4H.json`);

    // ✅ Use cache if available
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) {
        console.log(`Using cached 4H data (${cached.data.length} candles)`);
        return cached.data;
      }
    }

    console.log("Generating 4H data from 1H candles...");

    const oneHData = await this.fetch1HData(symbol);

    const fourH = [];
    for (let i = 0; i < oneHData.length; i += 4) {
      const group = oneHData.slice(i, i + 4);
      if (group.length < 4) continue;

      const open = group[0].open;
      const close = group[group.length - 1].close;
      const high = Math.max(...group.map(c => c.high));
      const low = Math.min(...group.map(c => c.low));
      const timestamp = group[group.length - 1].timestamp;

      fourH.push({ timestamp, open, high, low, close, volume: 0 });
    }

    fs.writeFileSync(
      cacheFile,
      JSON.stringify({ symbol, interval: '4H', fetchedAt: new Date().toISOString(), data: fourH }, null, 2)
    );

    console.log(`Generated ${fourH.length} 4H candles`);
    return fourH;
  }
}

module.exports = IntradayDataFetcher;
