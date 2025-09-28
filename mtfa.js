// mtfa.js  
// 🔍 Multi-Timeframe Analysis (MTFA)  
// Goal: Combine Daily + Weekly + Monthly indicators into overall bias  
  
const SwingDataFetcher = require("./swingDataFetcher");  
const SwingIndicators = require("./swing-indicators");  
  
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
  
      // ✅ Calculate indicators for each timeframe (async with TA-Lib)  
      const dailyIndicators = await SwingIndicators.calculateAll(daily);  
      const weeklyIndicators = await SwingIndicators.calculateAll(weekly);  
      const monthlyIndicators = await SwingIndicators.calculateAll(monthly);  
  
      // ✅ Get bias for each timeframe  
      const dailyBias = this.getBias(dailyIndicators);  
      const weeklyBias = this.getBias(weeklyIndicators);  
      const monthlyBias = this.getBias(monthlyIndicators);  
  
      // ✅ Confluence Logic  
      const allBiases = [dailyBias, weeklyBias, monthlyBias];  
      const bullishCount = allBiases.filter(b => b === "BULLISH").length;  
      const bearishCount = allBiases.filter(b => b === "BEARISH").length;  
  
      let overallBias = "NEUTRAL";  
      let confidence = 50;  
  
      if (bullishCount === 3) {  
        overallBias = "BULLISH";  
        confidence = 100;  
      } else if (bearishCount === 3) {  
        overallBias = "BEARISH";  
        confidence = 100;  
      } else if (bullishCount === 2) {  
        overallBias = "BULLISH";  
        confidence = 70;  
      } else if (bearishCount === 2) {  
        overallBias = "BEARISH";  
        confidence = 70;  
      } else if (bullishCount === 1 || bearishCount === 1) {  
        overallBias = "NEUTRAL";  
        confidence = 40;  
      }  
  
      // ✅ Final Result  
      const result = {  
        pair,  
        daily: dailyIndicators,  
        weekly: weeklyIndicators,  
        monthly: monthlyIndicators,  
        biases: {  
          daily: dailyBias,  
          weekly: weeklyBias,  
          monthly: monthlyBias,  
        },  
        overallBias,  
        confidence  
      };  
  
      return result;  
    } catch (err) {  
      console.error("❌ Error in MTFA analysis:", err.message);  
      return null;  
    }  
  }  
  
  /**  
   * Simple bias calculation from indicators  
   * Rule: EMA20 vs EMA50  
   */  
  static getBias(indicators) {  
    if (!indicators || !indicators.ema20 || !indicators.ema50) return "NEUTRAL";  
  
    if (indicators.ema20 > indicators.ema50) return "BULLISH";  
    if (indicators.ema20 < indicators.ema50) return "BEARISH";  
  
    return "NEUTRAL";  
  }  
}  
  
module.exports = MTFA;
