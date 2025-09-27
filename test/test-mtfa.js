// test-mtfa.js
const MultiTimeframeAnalysis = require("../mtfa");

async function testMTFA() {
  console.log("🔍 Testing Multi-Timeframe Analysis...");

  try {
    const mtfa = new MultiTimeframeAnalysis();

    // ✅ Test EUR/USD pair
    const result = await mtfa.analyze("EUR/USD");

    console.log("\n📊 Multi-Timeframe Analysis Result:");
    console.dir(result, { depth: null });

    console.log("\n✅ Test Completed!");
  } catch (err) {
    console.error("❌ Error while testing MTFA:", err.message);
    console.error(err);
  }
}

testMTFA();
