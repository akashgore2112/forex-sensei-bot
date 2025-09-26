const axios = require("axios");

// Alpha Vantage API setup
const API_KEY = "E391L86ZEMDYMFGP";
const BASE_URL = "https://www.alphavantage.co/query";

// Helper: fetch daily OHLC data
async function getDailyData(fromSymbol, toSymbol) {
  try {
    const url = `${BASE_URL}?function=FX_DAILY&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&apikey=${API_KEY}&outputsize=full`;
    const response = await axios.get(url);

    return response.data["Time Series FX (Daily)"];
  } catch (error) {
    console.error("❌ Error fetching daily data:", error.message);
    return null;
  }
}

// EMA calculation
function calculateEMA(values, period) {
  const k = 2 / (period + 1);
  let emaArray = [];
  let ema = values[0];

  emaArray.push(ema);

  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    emaArray.push(ema);
  }
  return emaArray;
}

// RSI calculation
function calculateRSI(values, period = 14) {
  let gains = [];
  let losses = [];

  for (let i = 1; i < values.length; i++) {
    let diff = values[i] - values[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  let rsiArray = [];

  for (let i = period; i < values.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - 100 / (1 + rs);

    rsiArray.push(rsi);
  }

  return rsiArray;
}

// Backtest strategy
async function backtestSwing(fromSymbol, toSymbol) {
  console.log(`\n📊 Backtesting ${fromSymbol}/${toSymbol} (Swing Strategy)...`);

  const data = await getDailyData(fromSymbol, toSymbol);
  if (!data) return;

  const candles = Object.entries(data)
    .map(([date, ohlc]) => ({
      date,
      open: parseFloat(ohlc["1. open"]),
      high: parseFloat(ohlc["2. high"]),
      low: parseFloat(ohlc["3. low"]),
      close: parseFloat(ohlc["4. close"]),
    }))
    .reverse(); // oldest → newest

  const closes = candles.map(c => c.close);

  // Indicators
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);

  let signals = [];
  let balance = 1000; // starting balance
  let position = null;

  for (let i = 50; i < closes.length - 1; i++) {
    let date = candles[i].date;
    let close = candles[i].close;

    // Buy signal: EMA20 > EMA50 && RSI > 50
    if (ema20[i] > ema50[i] && rsi[i - 50] > 50 && !position) {
      position = { entry: close, date };
      signals.push({ type: "BUY", date, price: close });
    }

    // Sell signal: EMA20 < EMA50 && RSI < 50 && holding position
    if (ema20[i] < ema50[i] && rsi[i - 50] < 50 && position) {
      let profit = close - position.entry;
      balance += profit;
      signals.push({
        type: "SELL",
        date,
        price: close,
        profit,
        balance,
      });
      position = null;
    }
  }

  console.log("✅ Backtest Completed!");
  console.log(`📌 Final Balance: $${balance.toFixed(2)}`);
  console.log("📈 Signals:", signals.slice(-5)); // show last 5 signals
}

// Run Backtest
(async () => {
  await backtestSwing("EUR", "USD");
  await backtestSwing("GBP", "USD");
})();
