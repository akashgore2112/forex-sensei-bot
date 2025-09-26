const axios = require("axios");

// ✅ Yaha apna Alpha Vantage API key daalo
const API_KEY = "E391L86ZEMDYMFGP";
const BASE_URL = "https://www.alphavantage.co/query";

// ✅ Rate limiter (5 calls per minute)
class RateLimiter {
  constructor(maxCalls = 5, timeWindow = 60000) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindow;
    this.calls = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    this.calls = this.calls.filter(call => now - call < this.timeWindow);

    if (this.calls.length >= this.maxCalls) {
      const oldestCall = Math.min(...this.calls);
      const waitTime = this.timeWindow - (now - oldestCall);

      console.log(`⏳ Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.calls.push(now);
  }
}

const rateLimiter = new RateLimiter();

// ✅ Standardization helper
function standardizeRealTimeData(data) {
  const rate = data["Realtime Currency Exchange Rate"];
  if (!rate) return null;

  return {
    pair: `${rate["1. From_Currency Code"]}${rate["3. To_Currency Code"]}`,
    timestamp: new Date(rate["6. Last Refreshed"]).toISOString(),
    bid: parseFloat(rate["8. Bid Price"]),
    ask: parseFloat(rate["9. Ask Price"]),
    mid: parseFloat(rate["5. Exchange Rate"]),
    spread:
      parseFloat(rate["9. Ask Price"]) - parseFloat(rate["8. Bid Price"]),
  };
}

// ✅ API call wrapper
async function getRealTimeRate(from, to) {
  await rateLimiter.waitIfNeeded();

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: "CURRENCY_EXCHANGE_RATE",
        from_currency: from,
        to_currency: to,
        apikey: API_KEY,
      },
    });

    return standardizeRealTimeData(response.data);
  } catch (err) {
    console.error(`❌ Error fetching ${from}/${to}:`, err.message);
    return null;
  }
}

// ✅ Multi-symbol fetcher
async function fetchMultiplePairs(pairs) {
  const results = [];
  for (let [from, to] of pairs) {
    const data = await getRealTimeRate(from, to);
    if (data) results.push(data);
  }
  return results;
}

// ✅ Test run
(async () => {
  const forexPairs = [
    ["EUR", "USD"],
    ["GBP", "USD"],
    ["USD", "JPY"],
    ["AUD", "USD"],
    ["USD", "CHF"],
  ];

  console.log("📊 Fetching multiple forex pairs...\n");

  const results = await fetchMultiplePairs(forexPairs);

  console.log("✅ Final Data:");
  console.table(results);
})();
