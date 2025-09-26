const ti = require("technicalindicators");

class SwingIndicators {
  static calculateAll(data) {
    if (!data || data.length === 0) return {};

    const closes = data.map(d => d.close);

    return {
      ema20: ti.EMA.calculate({ period: 20, values: closes }).slice(-1)[0],
      ema50: ti.EMA.calculate({ period: 50, values: closes }).slice(-1)[0],
      ema200: ti.EMA.calculate({ period: 200, values: closes }).slice(-1)[0],
      rsi14: ti.RSI.calculate({ period: 14, values: closes }).slice(-1)[0],
      macd: ti.MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      }).slice(-1)[0],
      adx: ti.ADX.calculate({
        high: data.map(d => d.high),
        low: data.map(d => d.low),
        close: closes,
        period: 14
      }).slice(-1)[0],
      atr: ti.ATR.calculate({
        high: data.map(d => d.high),
        low: data.map(d => d.low),
        close: closes,
        period: 14
      }).slice(-1)[0],
      bollinger: ti.BollingerBands.calculate({
        values: closes,
        period: 20,
        stdDev: 2
      }).slice(-1)[0]
    };
  }
}

module.exports = SwingIndicators;
