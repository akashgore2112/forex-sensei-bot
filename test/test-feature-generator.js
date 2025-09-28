const MTFA = require('../mtfa'); 
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');

(async () => {
  try {
    const mtfaData = await MTFA.analyze("EUR/USD");

    console.log("=== RAW INDICATORS FROM MTFA (Daily) ===");
    console.log(mtfaData.daily.indicators);   // 👈 yaha dekhna hoga

    const marketData = mtfaData.daily.rawData;
    const indicators = mtfaData.daily.indicators;

    const fg = new FeatureGenerator();
    const features = fg.generateAllFeatures(marketData, indicators);

    console.log("=== Generated ML Features (from real Phase 1 output) ===");
    console.log(features);

  } catch (error) {
    console.error("Error running feature generator test:", error);
  }
})();
