// test/test-feature-generator.js

const MTFA = require('../mtfa'); 
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');

(async () => {
  try {
    // Step 1: Run MTFA to get real indicators
    const mtfaData = await MTFA.analyze("EUR/USD");

    // Extract daily candles + indicators
    const marketData = mtfaData.daily.rawData;
    const indicators = mtfaData.daily.indicators;

    // Step 2: Generate ML Features
    const fg = new FeatureGenerator();
    const features = fg.generateAllFeatures(marketData, indicators);

    // Step 3: Print results
    console.log("=== Generated ML Features (from real Phase 1 output) ===");
    console.log(features);

  } catch (error) {
    console.error("Error running feature generator test:", error);
  }
})();
