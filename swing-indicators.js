const talib = require("talib");

class SwingIndicators {
  static async calculateAll(data) {
    if (!data || data.length === 0) return {};

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // Helper wrapper for indicators that return `outReal`
    const runOutReal = (name, params) => {
      return new Promise((resolve, reject) => {
        talib.execute({ name, ...params }, (err, result) => {
          if (err) return reject(err);
          resolve(result.result.outReal || []); // Ensure we always get array
        });
      });
    };

    // Direct run for indicators with multiple outputs (MACD, BBANDS)
    const runRaw = (name, params) => {
      return new Promise((resolve, reject) => {
        talib.execute({ name, ...params }, (err, result) => {
          if (err) return reject(err);
          resolve(result.result);
        });
      });
    };

    // ✅ Indicators with TA-Lib
    const ema20 = await runOutReal("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 20
    });

    const ema50 = await runOutReal("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 50
    });

    const ema200 = await runOutReal("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 200
    });

    const rsi14 = await runOutReal("RSI", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 14
    });

    const macd = await runRaw("MACD", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInFastPeriod: 12,
      optInSlowPeriod: 26,
      optInSignalPeriod: 9
    });

    const adx = await runOutReal("ADX", {
      startIdx: 0,
      endIdx: closes.length - 1,
      high: highs,
      low: lows,
      close: closes,
      optInTimePeriod: 14
    });

    const atr = await runOutReal("ATR", {
      startIdx: 0,
      endIdx: closes.length - 1,
      high: highs,
      low: lows,
      close: closes,
      optInTimePeriod: 14
    });

    const bollinger = await runRaw("BBANDS", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 20,
      optInNbDevUp: 2,
      optInNbDevDn: 2,
      optInMAType: 0 // SMA
    });

    // ✅ Support/Resistance logic
    const supportResistance = this.calculateSupportResistance(data);

    // ✅ Final structured output
    return {
      ema20: ema20[ema20.length - 1],
      ema50: ema50[ema50.length - 1],
      ema200: ema200[ema200.length - 1],
      rsi14: rsi14[rsi14.length - 1],
      macd: {
        macd: macd.outMACD[macd.outMACD.length - 1],
        signal: macd.outMACDSignal[macd.outMACDSignal.length - 1],
        histogram: macd.outMACDHist[macd.outMACDHist.length - 1]
      },
      adx: adx[adx.length - 1],
      atr: atr[atr.length - 1],
      bollinger: {
        upper: bollinger.outRealUpperBand[bollinger.outRealUpperBand.length - 1],
        middle: bollinger.outRealMiddleBand[bollinger.outRealMiddleBand.length - 1],
        lower: bollinger.outRealLowerBand[bollinger.outRealLowerBand.length - 1]
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
