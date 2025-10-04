// backtesting/intraday-data-fetcher.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class IntradayDataFetcher {
  constructor() {
    this.apiKey = 'b5a7ca32025f4166a6c2e5381d64b242';
    this.baseUrl = 'https://api.twelvedata.com/time_series';
    this.cacheDir = path.join(__dirname, '../cache');

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async fetchData(symbol = "EUR/USD", interval = "1h") {
    const cacheFile = path.join(
      this.cacheDir,
      `${symbol.replace('/', '_')}_${interval}.json`
    );

    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();

      if (cacheAge < 24 * 60 * 60 * 1000) {
        console.log(`Using cached ${interval} data (${cached.data.length} candles)`);
        return cached.data;
      }
    }

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

    const candles = data.map(entry => ({
      timestamp: new Date(entry.datetime).toISOString(),
      open: parseFloat(entry.open),
      high: parseFloat(entry.high),
      low: parseFloat(entry.low),
      close: parseFloat(entry.close),
      volume: parseFloat(entry.volume || 0)
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    fs.writeFileSync(cacheFile, JSON.stringify({
      symbol,
      interval,
      fetchedAt: new Date().toISOString(),
      data: candles
    }, null, 2));

    console.log(`Fetched and cached ${candles.length} candles (${interval})`);
    return candles;
  }

  async fetchHistoricalBatches(symbol = "EUR/USD", interval = "1h", months = 24) {
    console.log(`Attempting to fetch ${months} months of ${interval} data in batches...`);
    
    const allCandles = [];
    const now = new Date();
    const batchSize = 5000;
    
    let candlesPerMonth;
    if (interval === "1h") candlesPerMonth = 24 * 30;
    else if (interval === "4h") candlesPerMonth = 6 * 30;
    
    const totalNeeded = months * candlesPerMonth;
    const batches = Math.ceil(totalNeeded / batchSize);
    
    console.log(`Need ~${totalNeeded} candles, fetching in ${batches} batch(es)...`);
    
    for (let i = 0; i < batches; i++) {
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() - (i * 7));
      
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 7);
      
      console.log(`  Batch ${i+1}: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      
      try {
        const params = {
          symbol: symbol,
          interval: interval,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          outputsize: 5000,
          apikey: this.apiKey,
          format: 'JSON'
        };
        
        const response = await axios.get(this.baseUrl, { params });
        
        if (response.data.status === "error") {
          console.log(`  Batch ${i+1} failed: ${response.data.message}`);
          break;
        }
        
        const data = response.data.values;
        if (data && Array.isArray(data)) {
          const candles = data.map(entry => ({
            timestamp: new Date(entry.datetime).toISOString(),
            open: parseFloat(entry.open),
            high: parseFloat(entry.high),
            low: parseFloat(entry.low),
            close: parseFloat(entry.close),
            volume: parseFloat(entry.volume || 0)
          }));
          
          allCandles.push(...candles);
          console.log(`  Batch ${i+1}: ${candles.length} candles fetched`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  Batch ${i+1} error: ${error.message}`);
        break;
      }
    }
    
    if (allCandles.length === 0) {
      console.log("Batch fetch failed, falling back to single request...");
      return this.fetchData(symbol, interval);
    }
    
    const unique = Array.from(
      new Map(allCandles.map(c => [c.timestamp, c])).values()
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(`Total fetched: ${unique.length} candles\n`);
    
    // Cache the result
    const cacheFile = path.join(
      this.cacheDir,
      `${symbol.replace('/', '_')}_${interval}.json`
    );
    
    fs.writeFileSync(cacheFile, JSON.stringify({
      symbol,
      interval,
      fetchedAt: new Date().toISOString(),
      data: unique
    }, null, 2));
    
    return unique;
  }

  async fetch4HData(symbol = "EUR/USD") {
    return this.fetchHistoricalBatches(symbol, "4h", 24);
  }

  async fetch1HData(symbol = "EUR/USD") {
    return this.fetchHistoricalBatches(symbol, "1h", 24);
  }
}

module.exports = IntradayDataFetcher;
