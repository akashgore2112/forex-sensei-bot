class ForexDataProcessor {
  // ✅ Standardize Real-time data
  static standardizeRealTimeData(alphaVantageData) {
    if (!alphaVantageData) return null;

    const rate = alphaVantageData;
    return {
      pair: `${rate['1. From_Currency Code']}${rate['3. To_Currency Code']}`,
      timestamp: new Date(rate['6. Last Refreshed']).toISOString(),
      bid: parseFloat(rate['8. Bid Price']),
      ask: parseFloat(rate['9. Ask Price']),
      mid: parseFloat(rate['5. Exchange Rate']),
      spread: parseFloat(rate['9. Ask Price']) - parseFloat(rate['8. Bid Price'])
    };
  }

  // ✅ Standardize OHLC Data
  static standardizeOHLCData(alphaVantageData, interval) {
    if (!alphaVantageData) return [];

    const timeSeries = alphaVantageData[`Time Series FX (${interval})`];
    if (!timeSeries) return [];

    const standardizedData = [];

    for (const [timestamp, ohlc] of Object.entries(timeSeries)) {
      standardizedData.push({
        timestamp: new Date(timestamp).toISOString(),
        open: parseFloat(ohlc['1. open']),
        high: parseFloat(ohlc['2. high']),
        low: parseFloat(ohlc['3. low']),
        close: parseFloat(ohlc['4. close']),
        volume: ohlc['5. volume'] ? parseFloat(ohlc['5. volume']) : 0
      });
    }

    return standardizedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
}

module.exports = ForexDataProcessor;
