const AlphaVantageAPI = require("./alphatest");
const { ForexDataProcessor } = require("./standardizer");

// 🔑 Tumhari API Key
const api = new AlphaVantageAPI("E391L86ZEMDYMFGP");

async function runTests() {
  console.log("🚀 Testing Standardizer Functions...\n");

  // 1. Real-time rate
  console.log("1️⃣ Real-time EUR/USD rate...");
  const realTime = await api.getRealTimeRate("EUR", "USD");
  if (realTime) {
    const cleanRealTime = ForexDataProcessor.standardizeRealTimeData(realTime);
    console.log("✅ Standardized Real-time:", cleanRealTime);
  } else {
    console.log("❌ Failed to fetch real-time rate");
  }

  await new Promise((r) => setTimeout(r, 15000)); // avoid rate limit

  // 2. Intraday candles
  console.log("\n2️⃣ Intraday candles (EUR/USD, 1min)...");
  const intraday = await api.getIntradayData("EUR", "USD", "1min");
  if (intraday && intraday["Time Series FX (1min)"]) {
    const cleanIntraday = ForexDataProcessor.standardizeOHLCData(
      intraday,
      "1min"
    );
    console.log("✅ Latest 2 candles:", cleanIntraday.slice(-2));
  } else {
    console.log("❌ Failed to fetch intraday data");
  }

  await new Promise((r) => setTimeout(r, 15000));

  // 3. RSI Indicator
  console.log("\n3️⃣ RSI indicator (EURUSD, 1min)...");
  const rsi = await api.getRSI("EURUSD", "1min", 14);
  if (rsi && rsi["Technical Analysis: RSI"]) {
    const latestTime = Object.keys(rsi["Technical Analysis: RSI"])[0];
    const latestRSI = rsi["Technical Analysis: RSI"][latestTime]["RSI"];
    console.log("✅ Standardized RSI:", {
      symbol: "EURUSD",
      interval: "1min",
      latestTime,
      RSI: latestRSI,
    });
  } else {
    console.log("❌ Failed to fetch RSI");
  }
}

runTests();
