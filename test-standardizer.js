const AlphaVantageAPI = require('./alphatest');
const ForexDataProcessor = require('./standardizer');

// ✅ Apni API key daalo
const api = new AlphaVantageAPI("E391L86ZEMDYMFGP");

async function runTests() {
  console.log("📊 Testing Standardizer Functions...\n");

  // Test Real-time
  console.log("➡️ Real-time EUR/USD rate...");
  const realTime = await api.getRealTimeRate("EUR", "USD");
  if (realTime) {
    const cleanRealTime = ForexDataProcessor.standardizeRealTimeData(realTime);
    console.log("✅ Standardized Real-time:", cleanRealTime);
  } else {
    console.log("❌ Failed to fetch real-time data");
  }

  // Test Intraday
  console.log("\n➡️ Intraday EUR/USD (1min)...");
  const intraday = await api.getIntradayData("EUR", "USD", "1min");
  if (intraday && intraday["Time Series FX (1min)"]) {
    const cleanIntraday = ForexDataProcessor.standardizeOHLCData(intraday, "1min");
    console.log("✅ Sample Intraday Candle:", cleanIntraday[0]);
  } else {
    console.log("❌ Failed to fetch intraday data");
  }
}

runTests();
