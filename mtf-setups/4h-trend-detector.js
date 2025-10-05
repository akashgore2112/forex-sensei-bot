// mtf-setups/4h-trend-detector.js
class FourHTrendDetector {
  constructor() {
    this.minADX = 12; // Minimum trend strength
  }

  /**
   * Detect 4H trend direction using EMA alignment
   * Returns: BULLISH, BEARISH, or NEUTRAL
   */
  detectTrend(candles4H, indicators4H) {
    if (!candles4H || candles4H.length < 50) {
      return this.getNoTrend("Insufficient 4H candles");
    }

    const current = candles4H[candles4H.length - 1];
    const ema20 = indicators4H.ema20[indicators4H.ema20.length - 1];
    const ema50 = indicators4H.ema50[indicators4H.ema50.length - 1];
    const adx = indicators4H.adx[indicators4H.adx.length - 1];

    // Check trend strength
    if (adx < this.minADX) {
      return this.getNoTrend(`Weak trend (ADX ${adx.toFixed(1)} < ${this.minADX})`);
    }

    // Determine trend direction
    let trend = "NEUTRAL";
    let reason = "";

    if (ema20 > ema50 && current.close > ema20) {
      trend = "BULLISH";
      reason = `Bullish trend: Price ${current.close.toFixed(5)} > EMA20 ${ema20.toFixed(5)} > EMA50 ${ema50.toFixed(5)}, ADX=${adx.toFixed(1)}`;
    } else if (ema20 < ema50 && current.close < ema20) {
      trend = "BEARISH";
      reason = `Bearish trend: Price ${current.close.toFixed(5)} < EMA20 ${ema20.toFixed(5)} < EMA50 ${ema50.toFixed(5)}, ADX=${adx.toFixed(1)}`;
    } else {
      return this.getNoTrend("No clear trend alignment");
    }

    return {
      detected: true,
      trend: trend,
      ema20: Number(ema20.toFixed(5)),
      ema50: Number(ema50.toFixed(5)),
      adx: Number(adx.toFixed(1)),
      price: Number(current.close.toFixed(5)),
      reason: reason,
      timestamp: current.timestamp
    };
  }

  getNoTrend(reason) {
    return {
      detected: false,
      trend: "NEUTRAL",
      ema20: null,
      ema50: null,
      adx: null,
      price: null,
      reason: reason,
      timestamp: null
    };
  }
}

module.exports = FourHTrendDetector;
