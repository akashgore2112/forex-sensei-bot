// test-swing-indicators.js
const SwingDataCollector = require("./swing-data-collector");
const SwingIndicators = require("./swing-indicators");

const apiKey = "E391L86ZEMDYMFGP"; // tumhara Alpha Vantage key
const collector = new SwingDataCollector(apiKey);

async function testIndicators() {
  console.log("📊 Fetching Daily Data...");
  const dailyData = await collector.getDailyData("EUR", "USD");

  if (!dailyData || dailyData.length === 0) {
    console.error("❌ No daily data received!");
    return;
  }

  // Values prepare karo
  const close = dailyData.map((d) => d.close);
  const high = dailyData.map((d) => d.high);
  const low = dailyData.map((d) => d.low);

  console.log("✅ Data received. Calculating indicators...\n");

  // Indicators calculate karo
  const ema20 = SwingIndicators.calculateEMA(close, 20).slice(-1)[0];
  const ema50 = SwingIndicators.calculateEMA(close, 50).slice(-1)[0];
  const ema200 = SwingIndicators.calculateEMA(close, 200).slice(-1)[0];

  const rsi = SwingIndicators.calculateRSI(close).slice(-1)[0];
  const macd = SwingIndicators.calculateMACD(close).slice(-1)[0];
  const adx = SwingIndicators.calculateADX(high, low, close).slice(-1)[0];
  const atr = SwingIndicators.calculateATR(high, low, close).slice(-1)[0];
  const bb = SwingIndicators.calculateBollinger(close).slice(-1)[0];

  // Output
  console.log("📈 Latest Indicators:");
  console.log(`EMA20: ${ema20}`);
  console.log(`EMA50: ${ema50}`);
  console.log(`EMA200: ${ema200}`);
  console.log(`RSI(14): ${rsi}`);
  console.log("MACD:", macd);
  console.log("ADX:", adx);
  console.log("ATR:", atr);
  console.log("Bollinger Bands:", bb);
}

testIndicators();
