// strategies/mean-reversion-detector.js
const SupportResistanceDetector = require('./support-resistance-detector');

class MeanReversionDetector {
  constructor() {
    this.srDetector = new SupportResistanceDetector(20);
    this.rsiOversold = 25;
    this.rsiOverbought = 75;
    this.maxADX = 20; // Only trade in ranging conditions
  }

  /**
   * Scan for mean reversion setup
   * Returns: BUY at oversold support, SELL at overbought resistance
   */
  scan(candles4H, candles1H, indicators1H) {
    // Step 1: Identify S/R levels from 4H
    const srLevels = this.srDetector.detectLevels(candles4H);

    if (srLevels.support.length === 0 && srLevels.resistance.length === 0) {
      return this.getNoSetup("No S/R levels identified");
    }

    // Step 2: Check current 1H conditions
    const current1H = candles1H[candles1H.length - 1];
    const rsi = indicators1H.rsi[indicators1H.rsi.length - 1];
    const atr = indicators1H.atr[indicators1H.atr.length - 1];
    const adx = indicators1H.adx ? indicators1H.adx[indicators1H.adx.length - 1] : 15;

    // Step 3: Only trade in ranging conditions
    if (adx > this.maxADX) {
      return this.getNoSetup(`Strong trend (ADX ${adx.toFixed(1)} > ${this.maxADX})`);
    }

    // Step 4: Check for oversold at support (BUY setup)
    if (rsi < this.rsiOversold) {
      const nearSupport = this.srDetector.isPriceNearLevel(
        current1H.low,
        srLevels.support
      );

      if (nearSupport.near) {
        return {
          detected: true,
          direction: 'BUY',
          type: 'MEAN_REVERSION_OVERSOLD',
          rsi: Number(rsi.toFixed(1)),
          adx: Number(adx.toFixed(1)),
          level: nearSupport.level,
          distance: nearSupport.distance,
          atr: atr,
          candle: current1H,
          reason: `RSI oversold (${rsi.toFixed(1)}) at support ${nearSupport.level.price.toFixed(5)} (${nearSupport.level.touches} touches)`
        };
      }
    }

    // Step 5: Check for overbought at resistance (SELL setup)
    if (rsi > this.rsiOverbought) {
      const nearResistance = this.srDetector.isPriceNearLevel(
        current1H.high,
        srLevels.resistance
      );

      if (nearResistance.near) {
        return {
          detected: true,
          direction: 'SELL',
          type: 'MEAN_REVERSION_OVERBOUGHT',
          rsi: Number(rsi.toFixed(1)),
          adx: Number(adx.toFixed(1)),
          level: nearResistance.level,
          distance: nearResistance.distance,
          atr: atr,
          candle: current1H,
          reason: `RSI overbought (${rsi.toFixed(1)}) at resistance ${nearResistance.level.price.toFixed(5)} (${nearResistance.level.touches} touches)`
        };
      }
    }

    return this.getNoSetup(`RSI ${rsi.toFixed(1)} not extreme or not near S/R`);
  }

  /**
   * Calculate entry, SL, TP for mean reversion trade
   */
  calculateTrade(setup) {
    const entry = setup.candle.close;
    const atr = setup.atr;

    let stopLoss, takeProfit, risk;

    if (setup.direction === 'BUY') {
      // SL below support level
      stopLoss = setup.level.price - (atr * 1.0);
      risk = entry - stopLoss;
      takeProfit = entry + risk; // 1:1 R:R for mean reversion
    } else {
      // SL above resistance level
      stopLoss = setup.level.price + (atr * 1.0);
      risk = stopLoss - entry;
      takeProfit = entry - risk; // 1:1 R:R
    }

    return {
      entry: Number(entry.toFixed(5)),
      stopLoss: Number(stopLoss.toFixed(5)),
      takeProfit: Number(takeProfit.toFixed(5)),
      risk: Number(risk.toFixed(5)),
      riskReward: 1.0, // Mean reversion uses 1:1
      timestamp: setup.candle.timestamp
    };
  }

  getNoSetup(reason) {
    return {
      detected: false,
      direction: null,
      type: null,
      rsi: null,
      adx: null,
      level: null,
      distance: null,
      atr: null,
      candle: null,
      reason: reason
    };
  }
}

module.exports = MeanReversionDetector;
