const MTFA = require('../mtfa');
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');

(async () => {
  try {
    const pair = "EUR/USD";
    const mtfaData = await MTFA.analyze(pair);

    console.log("\n=== RAW MTFA OUTPUT ===");
    console.log(JSON.stringify(mtfaData, null, 2));

    // ✅ Debug 1: dekhte hain candles ke structure
    if (mtfaData.daily?.rawData) {
      console.log("\n=== Last 5 Daily Candles ===");
      console.log(mtfaData.daily.rawData.slice(-5));   // 👈 yeh chahiye mujhe
    }

    // ✅ Debug 2: daily object ke andar kya keys hain
    console.log("\n=== Keys inside mtfaData.daily ===");
    console.log(Object.keys(mtfaData.daily));          // 👈 yeh bhi chahiye mujhe

    const marketData = mtfaData.daily?.rawData || [];
    const indicators = mtfaData.daily || {};

    const fg = new FeatureGenerator();
    const features = fg.generateAllFeatures(marketData, indicators);

    console.log("\n=== Generated ML Features (Step 2.4 Output) ===");
    console.log(features);

  } catch (error) {
    console.error("Error running feature generator test:", error);
  }
})();
