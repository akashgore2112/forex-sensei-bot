// mtf-setups/1h-entry-scanner.js  
const PullbackDetector = require('../trading-patterns/pullback-detector');  
const SwingDetector = require('../trading-patterns/swing-detector');  
  
class OneHourEntryScanner {  
  constructor() {  
    this.pullbackDetector = new PullbackDetector();  
    this.swingDetector = new SwingDetector(10); // 5 candle lookback for 1H swings  
  }  
  
  /**  
   * Scan for entry signal after 4H setup detected  
   * @param {Array} candles1H - 1H candles  
   * @param {Object} indicators1H - Must contain RSI and ATR  
   * @param {Object} setup4H - Result from 4H scanner  
   * @returns {Object} Entry signal  
   */  
  scanForEntry(candles1H, indicators1H, setup4H) {  
    // Rule 1: Must have valid 4H setup  
    if (!setup4H || !setup4H.detected) {  
      return this.getNoEntry("No 4H setup exists");  
    }  
  
    // Rule 2: Need sufficient candles  
    if (!candles1H || candles1H.length < 10) {  
      return this.getNoEntry("Insufficient 1H candles");  
    }  
  
    // Rule 3: Need indicators  
    if (!indicators1H.rsi || !indicators1H.atr) {  
      return this.getNoEntry("Missing RSI or ATR indicators");  
    }  
  
    const currentRSI = indicators1H.rsi[indicators1H.rsi.length - 1];  
    const currentATR = indicators1H.atr[indicators1H.atr.length - 1];  
  
    // Rule 4: Check if pullback complete  
    const pullback = this.pullbackDetector.isPullbackComplete(  
      candles1H,  
      setup4H.engulfingLevel,  
      setup4H.direction,  
      currentRSI  
    );  
  
    if (!pullback || !pullback.complete) {  
      return this.getNoEntry("Pullback not complete yet");  
    }  
  
    // Rule 5: Calculate entry, SL, TP  
    const currentCandle = candles1H[candles1H.length - 1];  
    const entry = currentCandle.close;  
      
    const { stopLoss, takeProfit, riskReward } = this.calculateRiskReward(  
      entry,  
      setup4H.direction,  
      candles1H,  
      currentATR,  
      setup4H.adx  
    );  
  
    // All conditions met - entry signal ready  
    return {  
      entryReady: true,  
      direction: setup4H.direction,  
      entry: Number(entry.toFixed(5)),  
      stopLoss: Number(stopLoss.toFixed(5)),  
      takeProfit: Number(takeProfit.toFixed(5)),  
      riskReward: riskReward,  
      pattern: pullback.pattern,  
      rsi: currentRSI,  
      atr: currentATR,  
      adx: setup4H.adx,  
      engulfingLevel: setup4H.engulfingLevel,  
      reason: `Entry conditions met. ${pullback.reason}. R:R ${riskReward}:1`,  
      timestamp: currentCandle.timestamp  
    };  
  }  
  
  /**  
   * Calculate SL/TP based on your rules  
   * SL: 1H swing +/- (ATR × 0.5)  
   * TP: 1.5R or 2R based on ATR/ADX  
   */  
  calculateRiskReward(entry, direction, candles1H, atr, adx) {  
    let stopLoss, risk, riskReward;  
  
    if (direction === "BUY") {  
      // Find recent swing low  
      const swingLow = this.swingDetector.getLatestSwingLow(candles1H);  
      const swingPrice = swingLow ? swingLow.price : candles1H[candles1H.length - 1].low;  
        
      // SL below swing - (ATR × 0.5)  
      stopLoss = swingPrice - (atr * 0.5);  
      risk = entry - stopLoss;  
  
    } else { // SELL  
      // Find recent swing high  
      const swingHigh = this.swingDetector.getLatestSwingHigh(candles1H);  
      const swingPrice = swingHigh ? swingHigh.price : candles1H[candles1H.length - 1].high;  
        
      // SL above swing + (ATR × 0.5)  
      stopLoss = swingPrice + (atr * 0.5);  
      risk = stopLoss - entry;  
    }  
  
    // Determine R:R (your rules: ATR > 0.0018 → 2R, else 1.5R. ADX > 25 → always 2R)  
    if (adx > 25) {  
      riskReward = 2.0;  
    } else if (atr > 0.0018) {  
      riskReward = 2.0;  
    } else {  
      riskReward = 1.5;  
    }  
  
    // Calculate TP  
    let takeProfit;  
    if (direction === "BUY") {  
      takeProfit = entry + (risk * riskReward);  
    } else {  
      takeProfit = entry - (risk * riskReward);  
    }  
  
    return { stopLoss, takeProfit, riskReward };  
  }  
  
  getNoEntry(reason) {  
    return {  
      entryReady: false,  
      direction: null,  
      entry: null,  
      stopLoss: null,  
      takeProfit: null,  
      riskReward: null,  
      pattern: null,  
      rsi: null,  
      atr: null,  
      adx: null,  
      engulfingLevel: null,  
      reason: reason,  
      timestamp: null  
    };  
  }  
}  
  
module.exports = OneHourEntryScanner;
