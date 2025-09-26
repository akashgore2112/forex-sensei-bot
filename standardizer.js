class ForexDataProcessor {
  // ✅ Standardize Real-time data
  static standardizeRealTimeData(alphaVantageData) {
    if (!alphaVantageData) return null;

    const rate = alphaVantageData;
    return {
      pair: `${rate['1. From_Currency Code']}/${rate['2. To_Currency Code']}`,
      timestamp: new Date(rate['6. Last Refreshed']).toISOString(),
      bid: parseFloat(rate['8. Bid Price']),
      ask: parseFloat(rate['9. Ask Price']),
      mid: (parseFloat(rate['8. Bid Price']) + parseFloat(rate['9. Ask Price'])) / 2,
      spread: parseFloat(rate['9. Ask Price']) - parseFloat(rate['8. Bid Price'])
    };
  }

  // ✅ Standardize OHLC Data (Daily / Weekly)
  static standardizeOHLCData(alphaVantageData, interval) {
    if (!alphaVantageData) return [];

    let timeSeries;
    if (interval === "DAILY") {
      timeSeries = alphaVantageData["Time Series FX (Daily)"];
    } else if (interval === "WEEKLY") {
      timeSeries = alphaVantageData["Time Series FX (Weekly)"];
    }

    if (!timeSeries) return [];

    const standardizedData = [];
    for (const [timestamp, ohlc] of Object.entries(timeSeries)) {
      standardizedData.push({
        date: new Date(timestamp).toISOString(),
        open: parseFloat(ohlc["1. open"]),
        high: parseFloat(ohlc["2. high"]),
        low: parseFloat(ohlc["3. low"]),
        close: parseFloat(ohlc["4. close"])
      });
    }

    return standardizedData.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

module.exports = ForexDataProcessor;
