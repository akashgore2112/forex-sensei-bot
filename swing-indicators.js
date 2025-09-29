const talib = require("talib");

class SwingIndicators {
  static async calculateAll(data) {
    if (!data || data.length === 0) return {};

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    const runOutReal = (name, params) => {
      return new Promise((resolve, reject) => {
        talib.execute({ name, ...params }, (err, result) => {
          if (err) return reject(err);
          resolve(result.result.outReal || []);
        });
      });
    };

    const runRaw = (name, params) => {
      return new Promise((resolve, reject) => {
        talib.execute({ name, ...params }, (err, result) => {
          if (err) return reject(err);
          resolve(result.result);
        });
      });
    };

    // Calculate indicators
    const ema20Raw = await runOutReal("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 20
    });

    const ema50Raw = await runOutReal("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 50
    });

    const ema200Raw = await runOutReal("EMA", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 200
    });

    const rsi14Raw = await runOutReal("RSI", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 14
    });

    const macdRaw = await runRaw("MACD", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInFastPeriod: 12,
      optInSlowPeriod: 26,
      optInSignalPeriod: 9
    });

    const adxRaw = await runOutReal("ADX", {
      startIdx: 0,
      endIdx: closes.length - 1,
      high: highs,
      low: lows,
      close: closes,
      optInTimePeriod: 14
    });

    const atrRaw = await runOutReal("ATR", {
      startIdx: 0,
      endIdx: closes.length - 1,
      high: highs,
      low: lows,
      close: closes,
      optInTimePeriod: 14
    });

    const bollingerRaw = await runRaw("BBANDS", {
      startIdx: 0,
      endIdx: closes.length - 1,
      inReal: closes,
      optInTimePeriod: 20,
      optInNbDevUp: 2,
      optInNbDevDn: 2,
      optInMAType: 0
    });

    // Pad arrays to match candle length
    const padArray = (arr, skipDays, totalLength) => {
      const padded = new Array(totalLength).fill(null);
      for (let i = 0; i < arr.length; i++) {
        padded[skipDays + i] = arr[i];
      }
      return padded;
    };

    // Return arrays for each candle
    return {
      ema20: padArray(ema20Raw, 19, data.length),
      ema50: padArray(ema50Raw, 49, data.length),
      ema200: padArray(ema200Raw, 199, data.length),
      rsi14: padArray(rsi14Raw, 14, data.length),
      macd: {
        macd: padArray(macdRaw.outMACD, 33, data.length),
        signal: padArray(macdRaw.outMACDSignal, 33, data.length),
        histogram: padArray(macdRaw.outMACDHist, 33, data.length)
      },
      adx: padArray(adxRaw, 27, data.length),
      atr: padArray(atrRaw, 14, data.length),
      bollinger: {
        upper: padArray(bollingerRaw.outRealUpperBand, 19, data.length),
        middle: padArray(bollingerRaw.outRealMiddleBand, 19, data.length),
        lower: padArray(bollingerRaw.outRealLowerBand, 19, data.length)
      },
      supportResistance: this.calculateSupportResistance(data)
    };
  }

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
        strength: countTouches(level, lows) >= 3 ? "STRONG" : 
                  countTouches(level, lows) === 2 ? "MEDIUM" : "WEAK"
      }))
      .sort((a, b) => a.level - b.level);

    const uniqueResistances = [...new Set(resistanceLevels)]
      .map(level => ({
        level,
        touches: countTouches(level, highs),
        strength: countTouches(level, highs) >= 3 ? "STRONG" : 
                  countTouches(level, highs) === 2 ? "MEDIUM" : "WEAK"
      }))
      .sort((a, b) => a.level - b.level);

    return {
      support: uniqueSupports.slice(-3),
      resistance: uniqueResistances.slice(0, 3)
    };
  }
}

module.exports = SwingIndicators;
