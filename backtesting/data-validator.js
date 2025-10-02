// backtesting/data-validator.js
class DataValidator {
  /**
   * Validate historical candles
   * @param {Array} candles - Historical data
   */
  validate(candles) {
    console.log("\n🔍 Validating historical data...");
    const issues = [];

    // 1. Check for gaps
    for (let i = 1; i < candles.length; i++) {
      const prev = new Date(candles[i - 1].time);
      const curr = new Date(candles[i].time);
      const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);

      if (daysDiff > 4) {
        issues.push(`Gap detected: ${daysDiff} days between ${prev.toDateString()} and ${curr.toDateString()}`);
      }
    }

    // 2. Check for invalid prices
    for (const candle of candles) {
      if (candle.high < candle.low) {
        issues.push(`Invalid candle: high < low at ${candle.time}`);
      }
      if (candle.close > candle.high || candle.close < candle.low) {
        issues.push(`Invalid close price at ${candle.time}`);
      }
    }

    // Final report
    if (issues.length > 0) {
      console.log(`⚠️ Found ${issues.length} data quality issues`);
      issues.slice(0, 5).forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log("✅ Data validation passed - no issues found");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

module.exports = DataValidator;
