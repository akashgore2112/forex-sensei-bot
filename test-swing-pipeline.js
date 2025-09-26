const { runSwingPipeline } = require("./swing-pipeline");

async function testPipeline() {
  console.log("🚀 Testing Swing Pipeline...\n");

  const result = await runSwingPipeline("EUR/USD");

  if (result) {
    console.log("\n🎯 Pipeline Test Completed!");
    console.log("Pair:", result.pair);
    console.log("Latest Daily Close:", result.latestDaily.close);
    console.log("Latest Weekly Close:", result.latestWeekly.close);
    console.log("EMA20:", result.indicators.ema20);
    console.log("RSI14:", result.indicators.rsi);
  } else {
    console.log("⚠️ Pipeline test failed.");
  }
}

testPipeline();
