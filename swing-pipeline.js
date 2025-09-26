const SwingTradingDataCollector = require("./swing-data-collector");
const { ForexDataProcessor } = require("./standardizer");
const { SwingIndicators } = require("./swing-indicators");

const apiKey = "E391L86ZEMDYMFGP"; // Tumhara Alpha Vantage API key
const collector = new SwingTradingDataCollector(apiKey);
const processor = new ForexDataProcessor();
const indicators = new SwingIndicators();

async function runSwingPipeline(pair) {
  try {
    const [fromSymbol, toSymbol] = pair.split("/");

    console.log(`\n🔄 Running Swing Trading Pipeline for ${pair}...\n`);

    // Step 1: Fetch daily + weekly data
    console.log("📡 Fetching Daily Data...");
    const dailyRaw = await collector.getDailyData(fromSymbol, toSymbol, "compact");
    const dailyData = processor.standardizeOHLCData(dailyRaw, "Daily");

    console.log("📡 Fetching Weekly Data...");
    const weeklyRaw = await collector.getWeeklyData(fromSymbol, toSymbol);
    const weeklyData = processor.standardizeOHLCData(weeklyRaw, "Weekly");

    // Step 2: Calculate indicators
    console.log("📊 Calculating Indicators...");
    const enrichedData = indicators.calculateAll(dailyData);

    // Step 3: Final structured dataset
    const finalOutput = {
      pair: pair,
      latestDaily: dailyData[dailyData.length - 1],
      latestWeekly: weeklyData[weeklyData.length - 1],
      indicators: enrichedData[enrichedData.length - 1]
    };

    console.log("\n✅ Final Swing Dataset:");
    console.log(JSON.stringify(finalOutput, null, 2));

    return finalOutput;

  } catch (error) {
    console.error("❌ Pipeline error:", error.message);
  }
}

// Run pipeline
if (require.main === module) {
  runSwingPipeline("EUR/USD");
}

module.exports = { runSwingPipeline };
