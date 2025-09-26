const axios = require("axios");

// ⚡ Alpha Vantage API Key
const API_KEY = "E391L86ZEMDYMFGP";
const BASE_URL = "https://www.alphavantage.co/query";

// 🔹 Helper Functions
async function getDailyData(fromSymbol, toSymbol) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: "FX_DAILY",
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        outputsize: "compact",
        apikey: API_KEY,
      },
    });

    return response.data["Time Series FX (Daily)"];
  } catch (error) {
    console.error("❌ Error fetching daily data:", error.message);
    return null;
  }
}

// 🔹 Calculate EMA
function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let emaArray = [];
  let ema = 0;

  data.forEach((price, i) => {
    if (i === 0) {
      ema = price;
    } else {
      ema = price * k + ema * (1 - k);
    }
    emaArray.push(ema);
  });

  return emaArray;
}

// 🔹 Calculate RSI
function calculateRSI(closes, period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgGain / (avgLoss || 1);
  let rsi = 100 - 100 / (1 + rs);

  return rsi;
}

// 🔹 Generate Signal
async function generateSwingSignal(pair = "EUR/USD") {
  console.log(`\n📊 Generating Swing Signal for ${pair}...`);

  const [from, to] = pair.split("/");

  const rawData = await getDailyData(from, to);
  if (!rawData) return;

  const dates = Object.keys(rawData).slice(0, 100).reverse();
  const closes = dates.map((d) => parseFloat(rawData[d]["4. close"]));

  // EMA20 and EMA50
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);

  const lastEMA20 = ema20[ema20.length - 1];
  const lastEMA50 = ema50[ema50.length - 1];

  // RSI
  const rsi = calculateRSI(closes.slice(-15), 14);

  // Signal Logic
  let signal = "HOLD";
  if (lastEMA20 > lastEMA50 && rsi < 70) signal = "BUY";
  else if (lastEMA20 < lastEMA50 && rsi > 30) signal = "SELL";

  console.log(`✅ Swing Signal for ${pair}: ${signal}`);
  console.log(`   EMA20: ${lastEMA20.toFixed(4)}, EMA50: ${lastEMA50.toFixed(4)}, RSI: ${rsi.toFixed(2)}`);
}

// 🔹 Run Test
(async () => {
  await generateSwingSignal("EUR/USD");
  await generateSwingSignal("GBP/USD");
})();
