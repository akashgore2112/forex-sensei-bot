// backtesting/intraday-data-fetcher.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class IntradayDataFetcher {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.cacheDir = path.join(__dirname, '../cache');
    
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async fetch4HData(symbol = "EUR/USD", months = 24) {
    const cacheFile = path.join(this.cacheDir, `${symbol.replace('/', '_')}_4H.json`);
    
    // Check cache
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
      
      if (cacheAge < 24 * 60 * 60 * 1000) { // Less than 24 hours old
        console.log(`Using cached 4H data (${cached.data.length} candles)`);
        return cached.data;
      }
    }

    console.log(`Fetching 4H data for ${symbol}...`);
    
    // Alpha Vantage uses different format for forex
    const fromCurrency = symbol.split('/')[0];
    const toCurrency = symbol.split('/')[1];
    
    const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=240min&outputsize=full&apikey=${this.apiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${response.data['Error Message']}`);
    }
    
    if (response.data['Note']) {
      throw new Error('API rate limit reached. Wait 1 minute or use premium key.');
    }
    
    const timeSeries = response.data['Time Series FX (240min)'];
    
    if (!timeSeries) {
      throw new Error('No 4H data returned');
    }
    
    const candles = Object.entries(timeSeries).map(([timestamp, values]) => ({
      timestamp: new Date(timestamp).toISOString(),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: 0 // Forex doesn't have volume from Alpha Vantage
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Cache results
    fs.writeFileSync(cacheFile, JSON.stringify({
      symbol,
      interval: '4H',
      fetchedAt: new Date().toISOString(),
      data: candles
    }, null, 2));
    
    console.log(`Fetched ${candles.length} 4H candles`);
    return candles;
  }

  async fetch1HData(symbol = "EUR/USD", months = 24) {
    const cacheFile = path.join(this.cacheDir, `${symbol.replace('/', '_')}_1H.json`);
    
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
      
      if (cacheAge < 24 * 60 * 60 * 1000) {
        console.log(`Using cached 1H data (${cached.data.length} candles)`);
        return cached.data;
      }
    }

    console.log(`Fetching 1H data for ${symbol}...`);
    
    const fromCurrency = symbol.split('/')[0];
    const toCurrency = symbol.split('/')[1];
    
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
    
    const candles = Object.entries(timeSeries).map(([timestamp, values]) => ({
      timestamp: new Date(timestamp).toISOString(),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: 0
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    fs.writeFileSync(cacheFile, JSON.stringify({
      symbol,
      interval: '1H',
      fetchedAt: new Date().toISOString(),
      data: candles
    }, null, 2));
    
    console.log(`Fetched ${candles.length} 1H candles`);
    return candles;
  }
}

module.exports = IntradayDataFetcher;
