class ForexDataProcessor {
  // ✅ Standardize Real-time data
  static standardizeRealTimeData(alphaVantageData) {
    if (!alphaVantageData) {
      console.warn("⚠️ No real-time data received");
      return null;
    }

    try {
      const rate = alphaVantageData;

      return {
        pair: `${rate['1. From_Currency Code']}/${rate['2. To_Currency Code']}`,
        timestamp: new Date(rate['6. Last Refreshed'] || Date.now()).toISOString(),
        bid: parseFloat(rate['8. Bid Price'] || 0),
        ask: parseFloat(rate['9. Ask Price'] || 0),
        mid:
          (parseFloat(rate['8. Bid Price'] || 0) +
            parseFloat(rate['9. Ask Price'] || 0)) /
          2,
        spread:
          parseFloat(rate['9. Ask Price'] || 0) -
          parseFloat(rate['8. Bid Price'] || 0),
      };
    } catch (err) {
      console.error("❌ Error in standardizeRealTimeData:", err.message);
      return null;
    }
  }

  // ✅ Standardize OHLC Data (Daily / Weekly)
  static standardizeOHLCData(alphaVantageData, interval) {
    if (!alphaVantageData) {
      console.warn("⚠️ No OHLC data received");
      return [];
    }

    console.log(
      "🔍 Available Keys in AlphaVantage Response:",
      Object.keys(alphaVantageData)
    );

    let timeSeries;
    if (interval === "DAILY") {
      timeSeries = alphaVantageData["Time Series FX (Daily)"];
    } else if (interval === "WEEKLY") {
      timeSeries = alphaVantageData["Time Series FX (Weekly)"];
    }

    if (!timeSeries) {
      console.warn(`⚠️ Time series not found for interval: ${interval}`);
      return [];
    }

    try {
      const standardizedData = [];

      for (const [timestamp, ohlc] of Object.entries(timeSeries)) {
        standardizedData.push({
          date: new Date(timestamp).toISOString(),
          open: parseFloat(ohlc["1. open"] || 0),
          high: parseFloat(ohlc["2. high"] || 0),
          low: parseFloat(ohlc["3. low"] || 0),
          close: parseFloat(ohlc["4. close"] || 0),
        });
      }

      return standardizedData.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
    } catch (err) {
      console.error("❌ Error in standardizeOHLCData:", err.message);
      return [];
    }
  }
}

module.exports = ForexDataProcessor;
