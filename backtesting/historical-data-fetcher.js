// backtesting/historical-data-fetcher.js
const SwingDataFetcher = require('../swingDataFetcher');

class HistoricalDataFetcher {
  constructor() {
    // No instance needed - SwingDataFetcher uses static methods
  }

  /**
   * Fetch historical data for backtesting
   * @param {String} symbol - Currency pair (e.g., "EUR/USD")
   * @param {Number} yearsBack - How many years of data
   */
  async fetchData(symbol = "EUR/USD", yearsBack = 2) {
    console.log(`\n📥 Fetching ${yearsBack} years of historical data for ${symbol}...`);

    try {
      // Use existing Phase 1 SwingDataFetcher (includes caching & rate limiting)
      const dailyData = await SwingDataFetcher.getDailyData(symbol);

      if (!dailyData || dailyData.length === 0) {
        throw new Error("Failed to fetch historical data");
      }

      console.log(`✅ Fetched ${dailyData.length} total candles from Alpha Vantage`);

      // Filter to last N years
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack);

      const filtered = dailyData.filter(candle => {
        const candleDate = new Date(candle.timestamp);
        return candleDate >= cutoffDate;
      });

      console.log(`✅ Filtered to ${filtered.length} candles from last ${yearsBack} years`);

      // Sort by date (oldest first) for backtesting
      filtered.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });

      return filtered;

    } catch (error) {
      console.error("❌ Error fetching historical data:", error.message);
      throw error;
    }
  }

  /**
   * Split data into rolling windows for backtesting
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
