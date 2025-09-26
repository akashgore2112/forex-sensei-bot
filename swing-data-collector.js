const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SwingTradingDataCollector {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.cacheFile = path.join(__dirname, 'mock-daily-weekly.json');
  }

  async getDailyData(fromSymbol, toSymbol, outputSize = 'compact') {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'FX_DAILY',
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          outputsize: outputSize,
          apikey: this.apiKey
        }
      });

      if (response.data['Time Series FX (Daily)']) {
        return this.processDailyData(response.data);
      } else {
        console.log("⚠️ API limit reached or no data. Using fallback...");
        return this.loadMockData().daily;
      }
    } catch (err) {
      console.log("❌ Error fetching Daily Data, using fallback...");
      return this.loadMockData().daily;
    }
  }

  async getWeeklyData(fromSymbol, toSymbol) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'FX_WEEKLY',
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          apikey: this.apiKey
        }
      });

      if (response.data['Time Series FX (Weekly)']) {
        return this.processWeeklyData(response.data);
      } else {
        console.log("⚠️ API limit reached or no weekly data. Using fallback...");
        return this.loadMockData().weekly;
      }
    } catch (err) {
      console.log("❌ Error fetching Weekly Data, using fallback...");
      return this.loadMockData().weekly;
    }
  }

  processDailyData(data) {
    const series = data['Time Series FX (Daily)'];
    return Object.entries(series).map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close'])
    }));
  }

  processWeeklyData(data) {
    const series = data['Time Series FX (Weekly)'];
    return Object.entries(series).map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close'])
    }));
  }

  loadMockData() {
    if (fs.existsSync(this.cacheFile)) {
      return JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
    }
    // Agar fallback file nahi hai to static mock return karo
    return {
      daily: [
        { date: "2025-09-25", open: 1.1738, high: 1.1753, low: 1.1645, close: 1.1665 },
        { date: "2025-09-24", open: 1.1760, high: 1.1785, low: 1.1700, close: 1.1730 }
      ],
      weekly: [
        { date: "2025-09-21", open: 1.1700, high: 1.1800, low: 1.1600, close: 1.1750 },
        { date: "2025-09-14", open: 1.1650, high: 1.1720, low: 1.1580, close: 1.1620 }
      ]
    };
  }
}

module.exports = SwingTradingDataCollector;
