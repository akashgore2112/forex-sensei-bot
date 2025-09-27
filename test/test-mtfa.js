// test/test-mtfa.js
const MTFA = require("../mtfa");

async function testMTFA() {
  console.log("🔍 Testing Multi-Timeframe Analysis...");

  try {
    // ✅ Directly use static method
    const result = await MTFA.analyze("EUR/USD");

    console.log("\n📊 Multi-Timeframe Analysis Result:");
    console.dir(result, { depth: null });

    console.log("\n✅ Test Completed!");
  } catch (err) {
    console.error("❌ Error while testing MTFA:", err.message);
    console.error(err);
  }
}

testMTFA();
