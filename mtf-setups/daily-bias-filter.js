// mtf-setups/daily-bias-filter.js  
class DailyBiasFilter {  
  constructor() {  
    this.neutralThreshold = 0.001; // 0.1% separation threshold  
  }  
  
  /**  
   * Determine market bias from daily EMA alignment  
   * @param {Array} dailyCandles - Daily candles  
   * @param {Object} indicators - Must contain ema20 and ema50 arrays  
   * @returns {Object} Bias result  
   */  
  getBias(dailyCandles, indicators) {  
    if (!dailyCandles || dailyCandles.length < 50) {  
      return this.getDefaultBias("Insufficient candles");  
    }  
  
    if (!indicators.ema20 || !indicators.ema50) {  
      return this.getDefaultBias("Missing EMA indicators");  
    }  
  
    const latestCandle = dailyCandles[dailyCandles.length - 1];  
    const ema20 = indicators.ema20[indicators.ema20.length - 1];  
    const ema50 = indicators.ema50[indicators.ema50.length - 1];  
  
    if (!ema20 || !ema50) {  
      return this.getDefaultBias("Invalid EMA values");  
    }  
  
    // Calculate separation percentage  
    const separation = (ema20 - ema50) / ema50;  
    const separationPercent = separation * 100;  
  
    // Determine bias with threshold  
    let bias;  
    if (separation > this.neutralThreshold) {  
      bias = "BULLISH";  
    } else if (separation < -this.neutralThreshold) {  
      bias = "BEARISH";  
    } else {  
      bias = "NEUTRAL";  
    }  
  
    return {  
      bias: bias,  
      ema20: Number(ema20.toFixed(5)),  
      ema50: Number(ema50.toFixed(5)),  
      separation: Number(separationPercent.toFixed(2)),  
      price: latestCandle.close,  
      timestamp: latestCandle.timestamp,  
      valid: bias !== "NEUTRAL",  
      reason: this.getBiasReason(bias, separationPercent)  
    };  
  }  
  
  getBiasReason(bias, separationPercent) {  
    if (bias === "BULLISH") {  
      return `EMA20 above EMA50 by ${separationPercent.toFixed(2)}% - Bullish bias`;  
    } else if (bias === "BEARISH") {  
      return `EMA20 below EMA50 by ${Math.abs(separationPercent).toFixed(2)}% - Bearish bias`;  
    } else {  
      return `EMAs too close (${Math.abs(separationPercent).toFixed(2)}%) - No clear bias`;  
    }  
  }  
  
  getDefaultBias(reason) {  
    return {  
      bias: "NEUTRAL",  
      ema20: null,  
      ema50: null,  
      separation: 0,  
      price: null,  
      timestamp: null,  
      valid: false,  
      reason: reason  
    };  
  }  
  
  /**  
   * Check if bias is tradeable (not NEUTRAL)  
   */  
  isTradeable(biasResult) {  
    return biasResult.valid && biasResult.bias !== "NEUTRAL";  
  }  
}  
  
module.exports = DailyBiasFilter;
