const talib = require("talib");

class SwingIndicators {
  static async runIndicator(name, inputs) {
    return new Promise((resolve, reject) => {
      talib.execute(
        {
          name,
          startIdx: 0,
          endIdx: inputs.close.length - 1,
          ...inputs,
        },
        (err, result) => {
          if (err) return reject(err);
          if (!result || !result.result) return resolve(null);

          // Take last value (most recent)
          const values =
            result.result.outReal ||
            result.result.outMACD ||
            result.result.outADX ||
            result.result.outATR ||
            result.result.outRealUpperBand;
          resolve(values ? values[values.length - 1] : null);
        }
      );
    });
  }

  static async calculateAll(data) {
    if (!data || data.length === 0) return {};

    const closes = data.map((d) => d.close);
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);

    const ema20 = await this.runIndicator("EMA", { inReal: closes, optInTimePeriod: 20, close: closes });
    const ema50 = await this.runIndicator("EMA", { inReal: closes, optInTimePeriod: 50, close: closes });
    const ema200 = await this.runIndicator("EMA", { inReal: closes, optInTimePeriod: 200, close: closes });
    const rsi14 = await this.runIndicator("RSI", { inReal: closes, optInTimePeriod: 14, close: closes });
    const macd = await new Promise((resolve, reject) => {
      talib.execute(
        {
          name: "MACD",
          startIdx: 0,
          endIdx: closes.length - 1,
          inReal: closes,
          optInFastPeriod: 12,
          optInSlowPeriod: 26,
          optInSignalPeriod: 9,
        },
        (err, result) => {
          if (err) return reject(err);
          resolve({
            macd: result.result.outMACD.slice(-1)[0],
            signal: result.result.outMACDSignal.slice(-1)[0],
            histogram: result.result.outMACDHist.slice(-1)[0],
          });
        }
      );
    });

    // Extra indicators (ADX, ATR, Bollinger)
    const adx = await this.runIndicator("ADX", { high: highs, low: lows, close: closes, optInTimePeriod: 14 });
    const atr = await this.runIndicator("ATR", { high: highs, low: lows, close: closes, optInTimePeriod: 14 });
    const bollinger = await new Promise((resolve, reject) => {
      talib.execute(
        {
          name: "BBANDS",
          startIdx: 0,
          endIdx: closes.length - 1,
          inReal: closes,
          optInTimePeriod: 20,
          optInNbDevUp: 2,
          optInNbDevDn: 2,
          optInMAType: 0,
        },
        (err, result) => {
          if (err) return reject(err);
          resolve({
            upper: result.result.outRealUpperBand.slice(-1)[0],
            middle: result.result.outRealMiddleBand.slice(-1)[0],
            lower: result.result.outRealLowerBand.slice(-1)[0],
          });
        }
      );
    });

    const supportResistance = this.calculateSupportResistance(data);

    return {
      ema20,
      ema50,
      ema200,
      rsi14,
      macd,
      adx,
      atr,
      bollinger,
      supportResistance,
    };
  }

  // 🔍 support/resistance same jaise pehle tha
  static calculateSupportResistance(data, lookback = 50) {
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const recentData = data.slice(-lookback);

    let support = [];
    let resistance = [];

    for (let i = 2; i < recentData.length - 2; i++) {
      if (
        recentData[i].low < recentData[i - 2].low &&
        recentData[i].low < recentData[i + 2].low
      ) {
        support.push(recentData[i].low);
      }
      if (
        recentData[i].high > recentData[i - 2].high &&
        recentData[i].high > recentData[i + 2].high
      ) {
        resistance.push(recentData[i].high);
      }
    }

    return {
      support: support.slice(-3),
      resistance: resistance.slice(-3),
    };
  }
}

module.exports = SwingIndicators;
