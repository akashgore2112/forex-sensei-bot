const AlphaVantageAPI = require('./alphatest');
const ForexDataProcessor = require('./standardizer');

const api = new AlphaVantageAPI("E391L86ZEMDYMFGP");

// ⏳ Helper: delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔁 Helper: retry wrapper with delay
async function safeCall(fn, retries = 3, delay = 15000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (e) {
      console.log(`⚠️ Attempt ${i + 1} failed:`, e.message);
    }
    if (i < retries - 1) {
      console.log(`⏳ Waiting ${delay / 1000} sec before retry...`);
      await sleep(delay);
    }
  }
  return null;
}

async function testStandardizer() {
  console.log("\n🔍 Testing Standardizer Functions...\n");

  // ✅ Real-time rate
  console.log("📡 Real-time EUR/USD rate...");
  const realTime = await safeCall(() => api.getRealTimeRate("EUR", "USD"), 3, 15000);
  if (realTime) {
    const cleanRealTime = ForexDataProcessor.standardizeRealTimeData(realTime);
    console.log("✅ Standardized Real-time:", cleanRealTime);
  } else {
    console.log("❌ Failed to fetch real-time rate");
  }

  // Delay before next call
  await sleep(15000);

  // ✅ Intraday OHLC
  console.log("\n📊 Intraday EUR/USD (1min)...");
  const intraday = await safeCall(() => api.getIntradayData("EUR", "USD", "1min"), 3, 15000);
  if (intraday && intraday["Time Series FX (1min)"]) {
    const cleanIntraday = ForexDataProcessor.standardizeOHLCData(intraday, "1min", "EUR", "USD");
    console.log("✅ Standardized Intraday (latest 3 candles):", cleanIntraday.slice(-3));
  } else {
    console.log("❌ Failed to fetch intraday data");
  }

  // Delay before next call
  await sleep(15000);

  // ✅ Daily OHLC
  console.log("\n📅 Daily EUR/USD...");
  const daily = await safeCall(() => api.getDailyData("EUR", "USD", "compact"), 3, 15000);
  if (daily && daily["Time Series FX (Daily)"]) {
    const cleanDaily = ForexDataProcessor.standardizeOHLCData(daily, "DAILY", "EUR", "USD");
    console.log("✅ Standardized Daily (last 3 days):", cleanDaily.slice(-3));
  } else {
    console.log("❌ Failed to fetch daily data");
  }

  // Delay before next call
  await sleep(15000);

  // ✅ Weekly OHLC
  console.log("\n📅 Weekly EUR/USD...");
  const weekly = await safeCall(() => api.getWeeklyData("EUR", "USD"), 3, 15000);
  if (weekly && weekly["Time Series FX (Weekly)"]) {
    const cleanWeekly = ForexDataProcessor.standardizeOHLCData(weekly, "WEEKLY", "EUR", "USD");
    console.log("✅ Standardized Weekly (last 3 weeks):", cleanWeekly.slice(-3));
  } else {
    console.log("❌ Failed to fetch weekly data");
  }
}

// Run
testStandardizer();
