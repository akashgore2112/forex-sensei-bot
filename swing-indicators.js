// swing-indicators.js
const technicalIndicators = require("technicalindicators");

class SwingIndicators {
  // EMA (Exponential Moving Average)
  static calculateEMA(values, period) {
    return technicalIndicators.EMA.calculate({
      period: period,
      values: values,
    });
  }

  // RSI (Relative Strength Index)
  static calculateRSI(values, period = 14) {
    return technicalIndicators.RSI.calculate({
      period: period,
      values: values,
    });
  }

  // MACD (Moving Average Convergence Divergence)
  static calculateMACD(values, fast = 12, slow = 26, signal = 9) {
    return technicalIndicators.MACD.calculate({
      values: values,
      fastPeriod: fast,
      slowPeriod: slow,
      signalPeriod: signal,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
  }

  // ADX (Average Directional Index)
  static calculateADX(high, low, close, period = 14) {
    return technicalIndicators.ADX.calculate({
      high,
      low,
      close,
      period,
    });
  }

  // ATR (Average True Range) - volatility
  static calculateATR(high, low, close, period = 14) {
    return technicalIndicators.ATR.calculate({
      high,
      low,
      close,
      period,
    });
  }

  // Bollinger Bands
  static calculateBollinger(values, period = 20, stdDev = 2) {
    return technicalIndicators.BollingerBands.calculate({
      period: period,
      values: values,
      stdDev: stdDev,
    });
  }
}

module.exports = SwingIndicators;
