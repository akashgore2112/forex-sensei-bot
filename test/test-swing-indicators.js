const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");

async function testIndicators() {
  console.log("📊 Fetching EUR/USD Daily Data...");

  const dailyData = await SwingDataFetcher.getDailyData("EUR/USD");

  if (!dailyData || dailyData.length === 0) {
    console.error("❌ No daily data received!");
    return;
  }

  console.log(`✅ Received ${dailyData.length} candles. Calculating indicators...\n`);

  try {
    // ✅ Calculate all swing indicators (async with TA-Lib)
    const indicators = await SwingIndicators.calculateAll(dailyData);

    // ✅ Output neatly formatted
    console.log("📈 === Latest Swing Indicators ===");
    console.log(`EMA20           : ${indicators.ema20}`);
    console.log(`EMA50           : ${indicators.ema50}`);
    console.log(`EMA200          : ${indicators.ema200}`);
    console.log(`RSI(14)         : ${indicators.rsi14}`);
    console.log("MACD            :", indicators.macd);
    console.log(`ADX             : ${indicators.adx}`);
    console.log(`ATR             : ${indicators.atr}`);
    console.log("Bollinger Bands :", indicators.bollinger);

    console.log("\n🔍 === Support/Resistance Levels ===");
    console.log("Support Levels   :", indicators.supportResistance.support);
    console.log("Resistance Levels:", indicators.supportResistance.resistance);

    console.log("\n✅ Indicator Test Completed Successfully!");
  } catch (err) {
    console.error("❌ Error calculating indicators:", err);
  }
}

// Run
testIndicators();
