// swing-pipeline.js
// Complete Swing Data Pipeline (Phase 1 Step 3 + Step 4 ready)

// Dependencies
const axios = require("axios");
const ForexDataProcessor = require("./standardizer");
const SwingTradingDataCollector = require("./swing-data-collector");
const SwingIndicators = require("./swing-indicators");

// Config
const API_KEY = "E391L86ZEMDYMFGP"; // <-- apna AlphaVantage API key
const collector = new SwingTradingDataCollector(API_KEY);

// Forex Pipeline Class
class SwingPipeline {
  constructor() {
    this.cache = new Map(); // in-memory cache for testing
  }

  /**
   * Caching helper
   */
  getCache(key) {
    return this.cache.has(key) ? this.cache.get(key) : null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Fetch and Standardize Daily Data
   */
  async getDailyData(pair, outputSize = "compact") {
    const [fromSymbol, toSymbol] = pair.split("/");

    const cacheKey = `DAILY_${pair}_${outputSize}`;
    const cached = this.getCache(cacheKey);

    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      console.log("♻️ Using cached daily data...");
      return cached.data;
    }

    console.log(`📈 Fetching Daily Data (${pair})...`);
    const rawData = await collector.getDailyData(fromSymbol, toSymbol, outputSize);
    const standardized = ForexDataProcessor.standardizeOHLCData(rawData, "Daily");

    this.setCache(cacheKey, standardized);
    return standardized;
  }

  /**
   * Fetch and Standardize Weekly Data
   */
  async getWeeklyData(pair) {
    const [fromSymbol, toSymbol] = pair.split("/");

    const cacheKey = `WEEKLY_${pair}`;
    const cached = this.getCache(cacheKey);

    if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
      console.log("♻️ Using cached weekly data...");
      return cached.data;
    }

    console.log(`📈 Fetching Weekly Data (${pair})...`);
    const rawData = await collector.getWeeklyData(fromSymbol, toSymbol);
    const standardized = ForexDataProcessor.standardizeOHLCData(rawData, "Weekly");

    this.setCache(cacheKey, standardized);
    return standardized;
  }

  /**
   * Run Full Pipeline (Daily + Weekly + Indicators)
   */
  async runPipeline(pair) {
    try {
      console.log(`🚀 Running Swing Pipeline for ${pair}...`);

      // 1. Collect data
      const dailyData = await this.getDailyData(pair, "compact");
      const weeklyData = await this.getWeeklyData(pair);

      // 2. Calculate indicators
      const indicators = await SwingIndicators.calculateAll(dailyData);

      // 3. Package result
      return {
        pair,
        daily: dailyData.slice(0, 5), // latest 5 candles
        weekly: weeklyData.slice(0, 3), // latest 3 candles
        indicators,
      };
    } catch (error) {
      console.error("❌ Pipeline Error:", error.message);
      return null;
    }
  }
}

module.exports = SwingPipeline;
