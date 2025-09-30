// test/test-feature.js
const MTFA = require("../mtfa");   // root me hai mtfa.js
const FeatureGenerator = require("../ml-pipeline/feature-engineering/feature-generator");

async function runTest() {
  try {
    // Step 1: Run MTFA to get real data
    const mtfaData = await MTFA.analyze("EUR/USD");   // ✅ correct function call
    
    // Tumhare mtfa.js me indicators direct return ho rahe hai
    const candles = mtfaData.dailyCandles;       // ✅ candles from MTFA
    const indicators = mtfaData.daily;           // ✅ daily indicators
    
    // Step 2: Generate features
    const generator = new FeatureGenerator();
    const features = generator.generateAllFeatures(candles, indicators);
    
    // Step 3: Print results
    console.log("✅ Generated Features (Real Data):");
    console.log(JSON.stringify(features, null, 2));
    
    // Step 4: Basic validation
    console.log("\n🔍 Validation:");
    console.log("NaN check:", Object.values(features).some(v => isNaN(v)) ? "❌ FAIL" : "✅ PASS");
    console.log("Keys count:", Object.keys(features).length);
    
  } catch (err) {
    console.error("❌ Error during feature test:", err);
  }
}

runTest();
