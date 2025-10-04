// backtesting/indicator-calculator.js
class IndicatorCalculator {
  
  /**
   * Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(prices, period) {
    if (!prices || prices.length < period) {
      return Array(prices?.length || 0).fill(null);
    }

    const ema = [];
    const multiplier = 2 / (period + 1);

    // First EMA = SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
      ema.push(null);
    }
    ema[period - 1] = sum / period;

    // Calculate EMA for remaining values
    for (let i = period; i < prices.length; i++) {
      ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(prices, period = 14) {
    if (!prices || prices.length < period + 1) {
      return Array(prices?.length || 0).fill(50); // Default neutral
    }

    const rsi = [];
    const gains = [];
    const losses = [];

    // Calculate price changes
    for (let i = 0; i < period; i++) {
      rsi.push(50);
    }

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    // First average
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      const rs = avgGain / (avgLoss || 0.0001);
      rsi[i] = 100 - (100 / (1 + rs));

      // Update averages
      if (i < gains.length) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      }
    }

    return rsi;
  }

  /**
   * Calculate ATR (Average True Range)
   */
  calculateATR(candles, period = 14) {
    if (!candles || candles.length < period) {
      return Array(candles?.length || 0).fill(0.001); // Default small value
    }

    const tr = [];
    const atr = [];

    // First TR is just high - low
    tr.push(candles[0].high - candles[0].low);
    atr.push(null);

    // Calculate True Range for each candle
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const trueRange = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      tr.push(trueRange);

      if (i < period) {
        atr.push(null);
      }
    }

    // First ATR is average of first 'period' TRs
    const firstATR = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    atr[period - 1] = firstATR;

    // Calculate ATR using smoothing
    for (let i = period; i < candles.length; i++) {
      atr[i] = ((atr[i - 1] * (period - 1)) + tr[i]) / period;
    }

    return atr;
  }

  /**
   * Calculate ADX (Average Directional Index)
   */
  calculateADX(candles, period = 14) {
    if (!candles || candles.length < period * 2) {
      return Array(candles?.length || 0).fill(25); // Default neutral
    }

    const plusDM = [];
    const minusDM = [];
    const tr = [];

    // Calculate directional movements and true range
    for (let i = 1; i < candles.length; i++) {
      const highDiff = candles[i].high - candles[i - 1].high;
      const lowDiff = candles[i - 1].low - candles[i].low;

      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      tr.push(Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      ));
    }

    // Smooth the values
    const smoothPlusDM = this.smooth(plusDM, period);
    const smoothMinusDM = this.smooth(minusDM, period);
    const smoothTR = this.smooth(tr, period);

    // Calculate DI+ and DI-
    const plusDI = smoothPlusDM.map((val, i) => (val / (smoothTR[i] || 1)) * 100);
    const minusDI = smoothMinusDM.map((val, i) => (val / (smoothTR[i] || 1)) * 100);

    // Calculate DX
    const dx = plusDI.map((val, i) => {
      const sum = val + minusDI[i];
      return sum === 0 ? 0 : (Math.abs(val - minusDI[i]) / sum) * 100;
    });

    // Calculate ADX
    const adx = this.smooth(dx, period);

    // Pad beginning with default value
    const result = Array(candles.length).fill(25);
    for (let i = 0; i < adx.length; i++) {
      result[i + period] = adx[i];
    }

    return result;
  }

  smooth(values, period) {
    if (values.length < period) return values;

    const smoothed = [];
    let sum = 0;

    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    smoothed.push(sum / period);

    for (let i = period; i < values.length; i++) {
      smoothed.push(((smoothed[smoothed.length - 1] * (period - 1)) + values[i]) / period);
    }

    return smoothed;
  }
}

module.exports = IndicatorCalculator;
