const MTFA = require('../mtfa'); 
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');

(async () => {
  try {
    const mtfaData = await MTFA.analyze("EUR/USD");

    console.log("\n=== RAW MTFA OUTPUT ===");
    console.log(JSON.stringify(mtfaData, null, 2));

    console.log("\n=== RAW INDICATORS FROM MTFA (Daily) ===");
    console.log(JSON.stringify(mtfaData.daily, null, 2));  // 👈 fix yaha

    const marketData = mtfaData.daily.rawData;   // agar rawData available ho
    const indicators = mtfaData.daily;           // 👈 fix: direct daily use karna

    const fg = new FeatureGenerator();
    const features = fg.generateAllFeatures(marketData || [], indicators);

    console.log("\n=== Generated ML Features ===");
    console.log(features);

  } catch (error) {
    console.error("Error running feature generator test:", error);
  }
})();
