// test-swing-indicators.js
const SwingDataFetcher = require("./swingDataFetcher"); // ✅ hum daily/weekly fetcher use kar rahe hain
const SwingIndicators = require("./swing-indicators");

async function testIndicators() {
  console.log("📊 Fetching EUR/USD Daily Data...");

  const dailyData = await SwingDataFetcher.getDailyData("EUR/USD");

  if (!dailyData || dailyData.length === 0) {
    console.error("❌ No daily data received!");
    return;
  }

  console.log(`✅ Received ${dailyData.length} candles. Calculating indicators...\n`);

  // ✅ Calculate all swing indicators
  const indicators = SwingIndicators.calculateAll(dailyData);

  // ✅ Output
  console.log("📈 Latest Swing Indicators:");
  console.log(`EMA20: ${indicators.ema20}`);
  console.log(`EMA50: ${indicators.ema50}`);
  console.log(`EMA200: ${indicators.ema200}`);
  console.log(`RSI(14): ${indicators.rsi14}`);
  console.log("MACD:", indicators.macd);

  console.log("\n🔍 Support/Resistance Levels:");
  console.log("Support:", indicators.supportResistance.support);
  console.log("Resistance:", indicators.supportResistance.resistance);
}

// Run
testIndicators();
