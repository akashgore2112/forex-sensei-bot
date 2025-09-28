const talib = require("talib");

class SwingIndicators {
  static async calculateAll(data) {
    if (!data || data.length === 0) return {};

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // Helper function: TA-Lib wrapper
    const run = (name, params) => {
      return new Promise((resolve, reject) => {
        talib.execute({ name, ...params }, (err, result) => {
          if (err) return reject(err);
          resolve(result.result);
        });
      });
    };

    // ✅ Indicators with TA-Lib
    const ema20 = await run("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 20
    });

    const ema50 = await run("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 50
    });

    const ema200 = await run("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 200
    });

    const rsi14 = await run("RSI", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 14
    });

    const macd = await run("MACD", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInFastPeriod: 12,
      optInSlowPeriod: 26,
      optInSignalPeriod: 9
    });

    const adx = await run("ADX", {
      startIdx: 0,
      endIdx: closes.length - 1,
      high: highs,
      low: lows,
      close: closes,
      optInTimePeriod: 14
    });

    const atr = await run("ATR", {
      startIdx: 0,
      endIdx: closes.length - 1,
      high: highs,
      low: lows,
      close: closes,
      optInTimePeriod: 14
    });

    const bollinger = await run("BBANDS", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 20,
      optInNbDevUp: 2,
      optInNbDevDn: 2,
      optInMAType: 0 // simple MA
    });

    // ✅ Support/Resistance logic
    const supportResistance = this.calculateSupportResistance(data);

    // ✅ Final structured output
    return {
      ema20: ema20.pop(),
      ema50: ema50.pop(),
      ema200: ema200.pop(),
      rsi14: rsi14.pop(),
      macd: {
        macd: macd.outMACD.pop(),
        signal: macd.outMACDSignal.pop(),
        histogram: macd.outMACDHist.pop()
      },
      adx: adx.pop(),
      atr: atr.pop(),
      bollinger: {
        upper: bollinger.outRealUpperBand.pop(),
        middle: bollinger.outRealMiddleBand.pop(),
        lower: bollinger.outRealLowerBand.pop()
      },
      supportResistance
    };
  }

  // 🔍 Advanced Support/Resistance Logic
  static calculateSupportResistance(data, lookback = 50) {
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

      if (currLow < prevLow && currLow < nextLow) {
        supportLevels.push(currLow);
      }
      if (currHigh > prevHigh && currHigh > nextHigh) {
        resistanceLevels.push(currHigh);
      }
    }

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
      support: uniqueSupports.slice(-3),
      resistance: uniqueResistances.slice(0, 3)
    };
  }
}

module.exports = SwingIndicators;
