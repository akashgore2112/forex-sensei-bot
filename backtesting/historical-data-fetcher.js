// backtesting/historical-data-fetcher.js
const AlphaVantageAPI = require('./alpha-vantage-api');

class HistoricalDataFetcher {
  constructor() {
    this.api = new AlphaVantageAPI();
  }

  /**
   * Fetch historical data for backtesting
   * @param {String} symbol - Currency pair (e.g., "EUR/USD")
   * @param {Number} yearsBack - Number of years back (default 2)
   */
  async fetchData(symbol = "EUR/USD", yearsBack = 2) {
    console.log(`\n📥 Fetching ${yearsBack} years of historical data for ${symbol}...`);

    const pair = symbol.replace("/", "");
    const data = await this.api.fetchDailyData(pair);

    if (!data || data.length === 0) {
      throw new Error("❌ Failed to fetch historical data");
    }

    // Filter candles to last N years
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack);

    const filtered = data.filter(candle => {
      const candleDate = new Date(candle.time);
      return candleDate >= cutoffDate;
    });

    console.log(`✅ Fetched ${filtered.length} candles for backtesting`);
    return filtered;
  }

  /**
   * Split data into rolling windows
   * @param {Array} data - Candlestick array
   * @param {Number} windowSize - Size of rolling window
   */
  splitIntoWindows(data, windowSize = 100) {
    const windows = [];

    for (let i = windowSize; i < data.length; i++) {
      windows.push({
        data: data.slice(i - windowSize, i),
        currentIndex: i,
        currentCandle: data[i]
      });
    }

    console.log(`📊 Created ${windows.length} rolling windows`);
    return windows;
  }
}

module.exports = HistoricalDataFetcher;
