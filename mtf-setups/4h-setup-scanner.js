// mtf-setups/4h-setup-scanner.js  
const EngulfingDetector = require('../trading-patterns/engulfing-detector');  
  
class FourHourSetupScanner {  
  constructor() {  
    this.engulfingDetector = new EngulfingDetector();  
  }  
  
  /**  
   * Scan for valid 4H setup (engulfing + structure break + daily alignment)  
   * @param {Array} candles4H - 4H candles  
   * @param {Object} indicators4H - Must contain ADX  
   * @param {Object} dailyBias - Result from DailyBiasFilter  
   * @returns {Object} Setup result  
   */  
  scanForSetup(candles4H, indicators4H, dailyBias) {  
    // Rule 1: Daily bias must be valid (not NEUTRAL)  
    if (!dailyBias.valid || dailyBias.bias === "NEUTRAL") {  
      return this.getNoSetup("Daily bias is NEUTRAL or invalid");  
    }  
  
    // Rule 2: Need sufficient candles  
    if (!candles4H || candles4H.length < 50) {  
      return this.getNoSetup("Insufficient 4H candles");  
    }  
  
    // Rule 3: Detect engulfing pattern  
    const engulfing = this.engulfingDetector.detect(candles4H, indicators4H);  
  
    if (!engulfing) {  
      return this.getNoSetup("No engulfing pattern detected on 4H");  
    }  
  
    // Rule 4: Engulfing direction must match daily bias  
    const engulfingDirection = engulfing.direction; // "BUY" or "SELL"  
    const dailyDirection = dailyBias.bias === "BULLISH" ? "BUY" : "SELL";  
  
    if (engulfingDirection !== dailyDirection) {  
      return this.getNoSetup(  
        `Engulfing ${engulfingDirection} conflicts with daily bias ${dailyBias.bias}`  
      );  
    }  
  
    // All conditions met - valid setup  
    const engulfingLevel = this.getEngulfingLevel(engulfing);  
  
    return {  
      detected: true,  
      direction: engulfing.direction,  
      engulfingCandle: engulfing.candle,  
      engulfingLevel: engulfingLevel,  
      swingBroken: engulfing.swingBroken,  
      adx: engulfing.adx,  
      dailyBias: dailyBias.bias,  
      reason: `${engulfing.type} aligned with ${dailyBias.bias} daily bias. ${engulfing.reason}`,  
      timestamp: engulfing.candle.timestamp  
    };  
  }  
  
  /**  
   * Get the pullback level from engulfing candle  
   * For BUY: use engulfing low (price should pull back here)  
   * For SELL: use engulfing high  
   */  
  getEngulfingLevel(engulfing) {  
    if (engulfing.direction === "BUY") {  
      return engulfing.candle.low;  
    } else {  
      return engulfing.candle.high;  
    }  
  }  
  
  getNoSetup(reason) {  
    return {  
      detected: false,  
      direction: null,  
      engulfingCandle: null,  
      engulfingLevel: null,  
      swingBroken: null,  
      adx: null,  
      dailyBias: null,  
      reason: reason,  
      timestamp: null  
    };  
  }  
}  
  
module.exports = FourHourSetupScanner;
