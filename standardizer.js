// standardizer.js
class ForexDataProcessor {
  // Real-time exchange rate standardization
  static standardizeRealTimeData(rate) {
    if (!rate) return null;

    return {
      pair: `${rate['1. From_Currency Code']}/${rate['3. To_Currency Code']}`,
      timestamp: new Date(rate['6. Last Refreshed']).toISOString(),
      bid: parseFloat(rate['8. Bid Price']),
      ask: parseFloat(rate['9. Ask Price']),
      mid: parseFloat(rate['5. Exchange Rate']),
      spread: parseFloat(rate['9. Ask Price']) - parseFloat(rate['8. Bid Price'])
    };
  }

  // Intraday / OHLCV data standardization
  static standardizeOHLCData(data, interval = '1min') {
    const timeSeries = data[`Time Series FX (${interval})`];
    if (!timeSeries) return [];

    const standardized = [];

    for (const [timestamp, ohlc] of Object.entries(timeSeries)) {
      standardized.push({
        timestamp: new Date(timestamp).toISOString(),
        open: parseFloat(ohlc['1. open']),
        high: parseFloat(ohlc['2. high']),
        low: parseFloat(ohlc['3. low']),
        close: parseFloat(ohlc['4. close'])
      });
    }

    return standardized.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
}

module.exports = ForexDataProcessor;
