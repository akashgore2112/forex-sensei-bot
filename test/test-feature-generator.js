const MTFA = require('../mtfa'); 
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');

(async () => {
  try {
    const mtfaData = await MTFA.analyze("EUR/USD");

    console.log("\n=== RAW MTFA OUTPUT ===");
    console.log(JSON.stringify(mtfaData, null, 2));  // 👈 pura object print karega

    console.log("\n=== RAW INDICATORS FROM MTFA (Daily) ===");
    console.log(JSON.stringify(mtfaData.daily.indicators, null, 2));  // 👈 sirf daily indicators

    const marketData = mtfaData.daily.rawData;
    const indicators = mtfaData.daily.indicators;

    const fg = new FeatureGenerator();
    const features = fg.generateAllFeatures(marketData, indicators);

    console.log("\n=== Generated ML Features ===");
    console.log(features);

  } catch (error) {
    console.error("Error running feature generator test:", error);
  }
})();
