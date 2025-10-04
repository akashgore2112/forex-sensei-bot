// trading-setups/breakout-volume.js
class BreakoutVolumeSetup {
  constructor() {
    this.name = "BREAKOUT_VOLUME";
  }

  detect(candles, indicators, mtfa) {
    if (candles.length < 50) return null;

    const latest = candles[candles.length - 1];
    const bbUpper = indicators.bollinger.upper[indicators.bollinger.upper.length - 1];
    const bbLower = indicators.bollinger.lower[indicators.bollinger.lower.length - 1];
    const bbMiddle = indicators.bollinger.middle[indicators.bollinger.middle.length - 1];
    const adx = indicators.adx[indicators.adx.length - 1];
    const atr = indicators.atr[indicators.atr.length - 1];

    const bbWidth = bbUpper - bbLower;
    const avgBBWidth = this.calculateAvgBBWidth(indicators.bollinger, 20);
    const avgVolume = this.calculateAvgVolume(candles, 20);
    
    const checks = {
      isSqueeze: bbWidth < avgBBWidth * 0.7,
      adxRising: adx > indicators.adx[indicators.adx.length - 5] && adx > 20,
      breakout: latest.close > bbUpper || latest.close < bbLower,
      volumeSpike: latest.volume > avgVolume * 1.3
    };

    if (!Object.values(checks).every(v => v)) return null;

    const direction = latest.close > bbUpper ? "BUY" : "SELL";
    
    let entry, stopLoss, takeProfit;
    
    if (direction === "BUY") {
      entry = latest.close;
      stopLoss = bbMiddle;
      const risk = entry - stopLoss;
      takeProfit = entry + risk * 2.5;
    } else {
      entry = latest.close;
      stopLoss = bbMiddle;
      const risk = stopLoss - entry;
      takeProfit = entry - risk * 2.5;
    }

    const volRatio = (latest.volume / avgVolume).toFixed(2);
    const bbSqueezePct = ((bbWidth / avgBBWidth) * 100).toFixed(0);

    return {
      type: this.name,
      direction,
      entry,
      stopLoss,
      takeProfit,
      riskReward: 2.5,
      confidence: 0.70,
      reason: `${direction}: BB squeeze ${bbSqueezePct}%, Vol=${volRatio}x avg, ADX=${adx.toFixed(1)}, ATR=${(atr*10000).toFixed(1)}pips`,
      timestamp: latest.timestamp,
      indicators: { bbUpper, bbLower, adx, volume: latest.volume, avgVolume }
    };
  }

  calculateAvgBBWidth(bollinger, periods) {
    const widths = [];
    for (let i = Math.max(0, bollinger.upper.length - periods); i < bollinger.upper.length; i++) {
      widths.push(bollinger.upper[i] - bollinger.lower[i]);
    }
    return widths.reduce((a, b) => a + b, 0) / widths.length;
  }

  calculateAvgVolume(candles, periods) {
    const volumes = candles.slice(-periods).map(c => c.volume || 0);
    return volumes.reduce((a, b) => a + b, 0) / volumes.length;
  }
}

module.exports = BreakoutVolumeSetup;
