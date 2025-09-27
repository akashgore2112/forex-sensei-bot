// mtfa.js
// 🔍 Multi-Timeframe Analysis (MTFA)
// Goal: Combine Daily + Weekly + Monthly indicators into overall bias

const SwingDataFetcher = require("./swingDataFetcher");
const SwingIndicators = require("../swing-indicators");

class MTFA {
  /**
   * Run analysis on multiple timeframes
   * @param {string} pair - e.g. "EUR/USD"
   * @returns {object} result with indicators + confluence + confidence
   */
  static async analyze(pair = "EUR/USD") {
    try {
      console.log(`\n🔍 Running Multi-Timeframe Analysis for ${pair}...\n`);

      // ✅ Fetch data from all 3 timeframes
      const daily = await SwingDataFetcher.getDailyData(pair);
      const weekly = await SwingDataFetcher.getWeeklyData(pair);
      const monthly = await SwingDataFetcher.getMonthlyData(pair);

      if (!daily.length || !weekly.length || !monthly.length) {
        console.error("❌ Missing data from one or more timeframes!");
        return null;
      }

      // ✅ Calculate indicators for each timeframe
      const dailyIndicators = SwingIndicators.calculateAll(daily);
      const weeklyIndicators = SwingIndicators.calculateAll(weekly);
      const monthlyIndicators = SwingIndicators.calculateAll(monthly);

      // 🚧 Placeholder: later we’ll add confluence logic
      const result = {
        pair,
        daily: dailyIndicators,
        weekly: weeklyIndicators,
        monthly: monthlyIndicators,
        overallBias: "NEUTRAL", // temporary placeholder
        confidence: 0 // temporary placeholder
      };

      return result;
    } catch (err) {
      console.error("❌ Error in MTFA analysis:", err.message);
      return null;
    }
  }
}

module.exports = MTFA;
