// trading-setups/trend-pullback.js
class TrendPullbackSetup {
  constructor() {
    this.name = "TREND_PULLBACK";
  }

  detect(candles, indicators, mtfa) {
    if (candles.length < 50) return null;

    const latest = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    
    const ema20 = indicators.ema20[indicators.ema20.length - 1];
    const ema50 = indicators.ema50[indicators.ema50.length - 1];
    const rsi = indicators.rsi14[indicators.rsi14.length - 1];
    const atr = indicators.atr[indicators.atr.length - 1];

    // Rule 1: MTFA aligned (all 3 timeframes same bias)
    const mtfaAligned = 
      mtfa.biases.daily === mtfa.biases.weekly && 
      mtfa.biases.weekly === mtfa.biases.monthly &&
      mtfa.overallBias !== "NEUTRAL";

    if (!mtfaAligned) return null;

    // Rule 2: Price near EMA20 (within 0.15%)
    const distanceToEMA20 = Math.abs(latest.close - ema20) / ema20;
    const nearEMA20 = distanceToEMA20 < 0.0015;

    if (!nearEMA20) return null;

    // Rule 3: RSI between 40-60 (not extreme)
    const rsiNeutral = rsi > 40 && rsi < 60;

    if (!rsiNeutral) return null;

    // Rule 4: EMA20 above EMA50 for bullish, below for bearish
    const trendConfirmed = 
      (mtfa.overallBias === "BULLISH" && ema20 > ema50) ||
      (mtfa.overallBias === "BEARISH" && ema20 < ema50);

    if (!trendConfirmed) return null;

    // Calculate entry, SL, TP
    const direction = mtfa.overallBias === "BULLISH" ? "BUY" : "SELL";
    
    // Find recent swing point for SL
    const swingLow = this.findRecentSwingLow(candles, 20);
    const swingHigh = this.findRecentSwingHigh(candles, 20);
    
    let entry, stopLoss, takeProfit;
    
    if (direction === "BUY") {
      entry = latest.close;
      stopLoss = swingLow - atr * 0.5; // Below swing low
      const risk = entry - stopLoss;
      takeProfit = entry + risk * 2; // 2:1 R:R
    } else {
      entry = latest.close;
      stopLoss = swingHigh + atr * 0.5; // Above swing high
      const risk = stopLoss - entry;
      takeProfit = entry - risk * 2; // 2:1 R:R
    }

    return {
      type: this.name,
      direction,
      entry,
      stopLoss,
      takeProfit,
      riskReward: 2.0,
      confidence: 0.65,
      reason: `MTFA aligned ${direction}, pullback to EMA20, RSI neutral`,
      timestamp: latest.timestamp
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
