const axios = require('axios');

// Yaha apna Alpha Vantage API key daalo
const API_KEY = "E391L86ZEMDYMFGP";
const BASE_URL = "https://www.alphavantage.co/query";

// Helper: sleep for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==============================
// Fetch Intraday Data (H1)
// ==============================
async function getIntradayData(fromSymbol, toSymbol, interval = "60min") {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: "FX_INTRADAY",
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        interval: interval,
        outputsize: "compact",
        apikey: API_KEY
      }
    });

    const data = response.data[`Time Series FX (${interval})`];
    if (!data) {
      console.error("❌ Intraday data fetch failed", response.data);
      return null;
    }

    // Standardize format
    return Object.entries(data).map(([time, ohlc]) => ({
      timestamp: new Date(time).toISOString(),
      open: parseFloat(ohlc["1. open"]),
      high: parseFloat(ohlc["2. high"]),
      low: parseFloat(ohlc["3. low"]),
      close: parseFloat(ohlc["4. close"])
    }));
  } catch (err) {
    console.error("❌ Error fetching intraday data:", err.message);
    return null;
  }
}

// ==============================
// Fetch Daily Data
// ==============================
async function getDailyData(fromSymbol, toSymbol) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: "FX_DAILY",
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        outputsize: "compact",
        apikey: API_KEY
      }
    });

    const data = response.data["Time Series FX (Daily)"];
    if (!data) {
      console.error("❌ Daily data fetch failed", response.data);
      return null;
    }

    // Standardize format
    return Object.entries(data).map(([time, ohlc]) => ({
      timestamp: new Date(time).toISOString(),
      open: parseFloat(ohlc["1. open"]),
      high: parseFloat(ohlc["2. high"]),
      low: parseFloat(ohlc["3. low"]),
      close: parseFloat(ohlc["4. close"])
    }));
  } catch (err) {
    console.error("❌ Error fetching daily data:", err.message);
    return null;
  }
}

// ==============================
// Testing Function
// ==============================
async function testSignalEngine() {
  console.log("\n📊 Testing Signal Engine...");

  // Intraday H1
  console.log("\n⏳ Fetching EUR/USD Intraday (H1)...");
  const intraday = await getIntradayData("EUR", "USD", "60min");
  if (intraday) {
    console.log("✅ Latest Intraday Candle:", intraday[0]);
  }

  await sleep(15000); // to respect API rate limit

  // Daily
  console.log("\n⏳ Fetching EUR/USD Daily...");
  const daily = await getDailyData("EUR", "USD");
  if (daily) {
    console.log("✅ Latest Daily Candle:", daily[0]);
  }
}

// Run test if executed directly
if (require.main === module) {
  testSignalEngine();
}

// Export functions
module.exports = { getIntradayData, getDailyData };
