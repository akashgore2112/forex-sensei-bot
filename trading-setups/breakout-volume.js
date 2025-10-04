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

    // Rule 1: BB squeeze (width < 70% of average)
    const bbWidth = bbUpper - bbLower;
    const avgBBWidth = this.calculateAvgBBWidth(indicators.bollinger, 20);
    const isSqueeze = bbWidth < avgBBWidth * 0.7;

    if (!isSqueeze) return null;

    // Rule 2: ADX rising (trend building)
    const adxPrev = indicators.adx[indicators.adx.length - 5];
    const adxRising = adx > adxPrev && adx > 20;

    if (!adxRising) return null;

    // Rule 3: Price breakout of BB
    const breakoutUp = latest.close > bbUpper;
    const breakoutDown = latest.close < bbLower;

    if (!breakoutUp && !breakoutDown) return null;

    // Rule 4: Volume confirmation
    const avgVolume = this.calculateAvgVolume(candles, 20);
    const volumeSpike = latest.volume > avgVolume * 1.3;

    if (!volumeSpike) return null;

    // Setup detected
    const direction = breakoutUp ? "BUY" : "SELL";
    
    let entry, stopLoss, takeProfit;
    
    if (direction === "BUY") {
      entry = latest.close;
      stopLoss = bbMiddle; // Back inside range
      const risk = entry - stopLoss;
      takeProfit = entry + risk * 2.5; // 2.5:1 for breakouts
    } else {
      entry = latest.close;
      stopLoss = bbMiddle;
      const risk = stopLoss - entry;
      takeProfit = entry - risk * 2.5;
    }

    return {
      type: this.name,
      direction,
      entry,
      stopLoss,
      takeProfit,
      riskReward: 2.5,
      confidence: 0.70,
      reason: `BB squeeze + volume breakout ${direction}, ADX rising`,
      timestamp: latest.timestamp
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
