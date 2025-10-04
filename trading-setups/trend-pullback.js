// trading-setups/trend-pullback.js
class TrendPullbackSetup {
  constructor() {
    this.name = "TREND_PULLBACK";
  }

  detect(candles, indicators, mtfa) {
    if (candles.length < 50) return null;

    const latest = candles[candles.length - 1];
    const ema20 = indicators.ema20[indicators.ema20.length - 1];
    const ema50 = indicators.ema50[indicators.ema50.length - 1];
    const rsi = indicators.rsi14[indicators.rsi14.length - 1];
    const atr = indicators.atr[indicators.atr.length - 1];

    // Rule checks with logging
    const checks = {
      mtfaAligned: mtfa.biases.daily === mtfa.biases.weekly && 
                   mtfa.biases.weekly === mtfa.biases.monthly &&
                   mtfa.overallBias !== "NEUTRAL",
      
      nearEMA20: Math.abs(latest.close - ema20) / ema20 < 0.0015,
      
      rsiNeutral: rsi > 40 && rsi < 60,
      
      trendConfirmed: (mtfa.overallBias === "BULLISH" && ema20 > ema50) ||
                      (mtfa.overallBias === "BEARISH" && ema20 < ema50)
    };

    // If any check fails, return null
    if (!Object.values(checks).every(v => v)) return null;

    const direction = mtfa.overallBias === "BULLISH" ? "BUY" : "SELL";
    const swingLow = this.findRecentSwingLow(candles, 20);
    const swingHigh = this.findRecentSwingHigh(candles, 20);
    
    let entry, stopLoss, takeProfit;
    
    if (direction === "BUY") {
      entry = latest.close;
      stopLoss = swingLow - atr * 0.5;
      const risk = entry - stopLoss;
      takeProfit = entry + risk * 2.0;
    } else {
      entry = latest.close;
      stopLoss = swingHigh + atr * 0.5;
      const risk = stopLoss - entry;
      takeProfit = entry - risk * 2.0;
    }

    const distancePct = ((latest.close - ema20) / ema20 * 100).toFixed(2);
    
    return {
      type: this.name,
      direction,
      entry,
      stopLoss,
      takeProfit,
      riskReward: 2.0,
      confidence: 0.65,
      reason: `${direction}: MTFA=${mtfa.overallBias}, Price ${distancePct}% from EMA20, RSI=${rsi.toFixed(1)}, ATR=${(atr*10000).toFixed(1)}pips`,
      timestamp: latest.timestamp,
      indicators: { ema20, ema50, rsi, atr, price: latest.close }
    };
  }

  findRecentSwingLow(candles, lookback) {
    const recent = candles.slice(-lookback);
    return Math.min(...recent.map(c => c.low));
  }

  findRecentSwingHigh(candles, lookback) {
    const recent = candles.slice(-lookback);
    return Math.max(...recent.map(c => c.high));
  }
}

module.exports = TrendPullbackSetup;
