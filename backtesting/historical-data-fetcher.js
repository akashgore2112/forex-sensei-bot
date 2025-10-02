// backtesting/historical-data-fetcher.js
const SwingDataFetcher = require('../swingDataFetcher');

class HistoricalDataFetcher {
  constructor() {
    this.swingFetcher = new SwingDataFetcher();
  }

  /**
   * Fetch historical data for backtesting
   * @param {String} symbol - Currency pair (e.g., "EUR/USD")
   * @param {Number} yearsBack - How many years of data
   */
  async fetchData(symbol = "EUR/USD", yearsBack = 2) {
    console.log(`\n📥 Fetching ${yearsBack} years of historical data for ${symbol}...`);

    try {
      const pair = symbol.replace("/", ""); // EUR/USD → EURUSD

      // Fetch daily data using existing Phase 1 swingDataFetcher
      const dailyData = await this.swingFetcher.fetchDailyCandles(pair);

      if (!dailyData || dailyData.length === 0) {
        throw new Error("Failed to fetch historical data");
      }

      console.log(`✅ Fetched ${dailyData.length} total candles`);

      // Filter to last N years
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack);

      const filtered = dailyData.filter(candle => {
        const candleDate = new Date(candle.time || candle.date || candle.timestamp);
        return candleDate >= cutoffDate;
      });

      console.log(`✅ Filtered to ${filtered.length} candles from last ${yearsBack} years`);

      // Sort by date (oldest first)
      filtered.sort((a, b) => {
        const dateA = new Date(a.time || a.date || a.timestamp);
        const dateB = new Date(b.time || b.date || b.timestamp);
        return dateA - dateB;
      });

      return filtered;

    } catch (error) {
      console.error("❌ Error fetching historical data:", error.message);
      throw error;
    }
  }

  /**
   * Split data into rolling windows
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

    console.log(`Created ${windows.length} rolling windows`);
    return windows;
  }
}

module.exports = HistoricalDataFetcher;
