const ti = require("technicalindicators");

class SwingIndicators {
  static calculateAll(data) {
    if (!data || data.length === 0) return {};

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // ✅ Indicators
    const ema20 = ti.EMA.calculate({ period: 20, values: closes });
    const ema50 = ti.EMA.calculate({ period: 50, values: closes });
    const ema200 = ti.EMA.calculate({ period: 200, values: closes });
    const rsi14 = ti.RSI.calculate({ period: 14, values: closes });
    const macd = ti.MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });

    // ✅ New Indicators
    const adx = ti.ADX.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14
    });

    const atr = ti.ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14
    });

    const bollinger = ti.BollingerBands.calculate({
      values: closes,
      period: 20,
      stdDev: 2
    });

    // ✅ Advanced Support/Resistance Detection
    const supportResistance = this.calculateSupportResistance(data);

    return {
      ema20: ema20.slice(-1)[0],
      ema50: ema50.slice(-1)[0],
      ema200: ema200.slice(-1)[0],
      rsi14: rsi14.slice(-1)[0],
      macd: macd.slice(-1)[0],
      adx: adx.slice(-1)[0],
      atr: atr.slice(-1)[0],
      bollinger: bollinger.slice(-1)[0],
      supportResistance
    };
  }

  // 🔍 Advanced Support/Resistance Logic
  static calculateSupportResistance(data, lookback = 50) {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    const recentData = data.slice(-lookback);

    let supportLevels = [];
    let resistanceLevels = [];

    for (let i = 2; i < recentData.length - 2; i++) {
      const prevLow = recentData[i - 2].low;
      const currLow = recentData[i].low;
      const nextLow = recentData[i + 2].low;

      const prevHigh = recentData[i - 2].high;
      const currHigh = recentData[i].high;
      const nextHigh = recentData[i + 2].high;

      // ✅ Identify support
      if (currLow < prevLow && currLow < nextLow) {
        supportLevels.push(currLow);
      }

      // ✅ Identify resistance
      if (currHigh > prevHigh && currHigh > nextHigh) {
        resistanceLevels.push(currHigh);
      }
    }

    // ✅ Strength calculation (count touches)
    const countTouches = (level, arr, tolerance = 0.001) =>
      arr.filter(v => Math.abs(v - level) / level < tolerance).length;

    const uniqueSupports = [...new Set(supportLevels)]
      .map(level => ({
        level,
        touches: countTouches(level, lows),
        strength:
          countTouches(level, lows) >= 3
            ? "STRONG"
            : countTouches(level, lows) === 2
            ? "MEDIUM"
            : "WEAK"
      }))
      .sort((a, b) => a.level - b.level);

    const uniqueResistances = [...new Set(resistanceLevels)]
      .map(level => ({
        level,
        touches: countTouches(level, highs),
        strength:
          countTouches(level, highs) >= 3
            ? "STRONG"
            : countTouches(level, highs) === 2
            ? "MEDIUM"
            : "WEAK"
      }))
      .sort((a, b) => a.level - b.level);

    return {
      support: uniqueSupports.slice(-3), // last 3 strong supports
      resistance: uniqueResistances.slice(0, 3) // first 3 strong resistances
    };
  }
}

module.exports = SwingIndicators;
