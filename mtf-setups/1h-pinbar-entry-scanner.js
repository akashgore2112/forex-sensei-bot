// mtf-setups/1h-pinbar-entry-scanner.js
const PinBarDetectorStrict = require('../trading-patterns/pinbar-detector-strict');
const SwingDetector = require('../trading-patterns/swing-detector');

class OneHPinBarEntryScanner {
  constructor() {
    this.pinBarDetector = new PinBarDetectorStrict();
    this.swingDetector = new SwingDetector(10);
  }

  /**
   * Scan for 1H pin bar entries that match 4H trend
   */
  scanForEntry(candles1H, indicators1H, trend4H) {
    // Rule 1: Must have valid 4H trend
    if (!trend4H || !trend4H.detected || trend4H.trend === "NEUTRAL") {
      return this.getNoEntry("No valid 4H trend");
    }

    if (!candles1H || candles1H.length < 30) {
      return this.getNoEntry("Insufficient 1H candles");
    }

    // Rule 2: Detect pin bar on 1H
    const pinBar = this.pinBarDetector.detect(candles1H);

    if (!pinBar) {
      return this.getNoEntry("No pin bar detected on 1H");
    }

    // Rule 3: Pin bar direction must match 4H trend
    const trendDirection = trend4H.trend === "BULLISH" ? "BUY" : "SELL";

    if (pinBar.direction !== trendDirection) {
      return this.getNoEntry(
        `Pin bar ${pinBar.direction} conflicts with 4H trend ${trend4H.trend}`
      );
    }

    // Rule 4: RSI confirmation (avoid extremes)
    const rsi = indicators1H.rsi[indicators1H.rsi.length - 1];
    if (rsi < 30 || rsi > 70) {
      return this.getNoEntry(`RSI extreme (${rsi.toFixed(1)})`);
    }

    // All conditions met - calculate entry/SL/TP
    const currentCandle = candles1H[candles1H.length - 1];
    const atr = indicators1H.atr[indicators1H.atr.length - 1];

    const { entry, stopLoss, takeProfit, riskReward } = this.calculateRiskReward(
      currentCandle,
      pinBar,
      candles1H,
      atr,
      trend4H.adx
    );

    return {
      entryReady: true,
      direction: pinBar.direction,
      entry: entry,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      riskReward: riskReward,
      pattern: pinBar.type,
      pinBarDetails: pinBar,
      rsi: rsi,
      atr: atr,
      adx: trend4H.adx,
      reason: `${pinBar.type} aligned with 4H ${trend4H.trend}. ${pinBar.reason}`,
      timestamp: currentCandle.timestamp
    };
  }

  calculateRiskReward(currentCandle, pinBar, candles1H, atr, adx) {
    const entry = currentCandle.close;
    let stopLoss, risk, riskReward;

    if (pinBar.direction === "BUY") {
      // SL below pin bar low - ATR buffer
      stopLoss = pinBar.candle.low - (atr * 0.5);
      risk = entry - stopLoss;
    } else {
      // SL above pin bar high + ATR buffer
      stopLoss = pinBar.candle.high + (atr * 0.5);
      risk = stopLoss - entry;
    }

    // Determine R:R (same logic as before)
    if (adx > 25) {
      riskReward = 2.0;
    } else if (atr > 0.0018) {
      riskReward = 2.0;
    } else {
      riskReward = 1.5;
    }

    const takeProfit = pinBar.direction === "BUY" 
      ? entry + (risk * riskReward)
      : entry - (risk * riskReward);

    return {
      entry: Number(entry.toFixed(5)),
      stopLoss: Number(stopLoss.toFixed(5)),
      takeProfit: Number(takeProfit.toFixed(5)),
      riskReward
    };
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
      pinBarDetails: null,
      rsi: null,
      atr: null,
      adx: null,
      reason: reason,
      timestamp: null
    };
  }
}

module.exports = OneHPinBarEntryScanner;
