// backtesting/mtf-data-manager.js
class MTFDataManager {
  constructor(dailyData, fourHData, oneHData) {
    this.daily = dailyData;
    this.fourH = fourHData;
    this.oneH = oneHData;
    
    this.validateAlignment();
  }

  validateAlignment() {
    const dailyStart = new Date(this.daily[0].timestamp);
    const fourHStart = new Date(this.fourH[0].timestamp);
    const oneHStart = new Date(this.oneH[0].timestamp);
    
    console.log(`Data alignment check:`);
    console.log(`  Daily: ${this.daily.length} candles from ${dailyStart.toISOString()}`);
    console.log(`  4H: ${this.fourH.length} candles from ${fourHStart.toISOString()}`);
    console.log(`  1H: ${this.oneH.length} candles from ${oneHStart.toISOString()}`);
  }

  getDailyCandle(timestamp) {
    // Find daily candle that contains this timestamp
    const targetDate = new Date(timestamp);
    targetDate.setUTCHours(0, 0, 0, 0);
    
    return this.daily.find(candle => {
      const candleDate = new Date(candle.timestamp);
      candleDate.setUTCHours(0, 0, 0, 0);
      return candleDate.getTime() === targetDate.getTime();
    });
  }

  get4HCandles(timestamp, lookback = 50) {
    // Get last N 4H candles up to this timestamp
    const targetTime = new Date(timestamp).getTime();
    
    const filtered = this.fourH.filter(candle => 
      new Date(candle.timestamp).getTime() <= targetTime
    );
    
    return filtered.slice(-lookback);
  }

  get1HCandles(timestamp, lookback = 100) {
    // Get last N 1H candles up to this timestamp
    const targetTime = new Date(timestamp).getTime();
    
    const filtered = this.oneH.filter(candle => 
      new Date(candle.timestamp).getTime() <= targetTime
    );
    
    return filtered.slice(-lookback);
  }

  getAlignedData(currentTimestamp) {
    // Get synchronized view of all timeframes at specific point
    return {
      daily: this.getDailyCandle(currentTimestamp),
      fourH: this.get4HCandles(currentTimestamp, 50),
      oneH: this.get1HCandles(currentTimestamp, 100)
    };
  }
}

module.exports = MTFDataManager;
