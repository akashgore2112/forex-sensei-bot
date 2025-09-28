const MTFA = require('../mtfa');
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');

(async () => {
  try {
    const pair = "EUR/USD";
    const mtfaData = await MTFA.analyze(pair);

    console.log("\n=== RAW MTFA OUTPUT ===");
    console.log(JSON.stringify(mtfaData, null, 2));

    // ✅ Indicators + raw OHLC candles dono extract karte hain
    const marketData = mtfaData.daily?.rawData || [];   // OHLC candles (close, high, low etc.)
    const indicators = mtfaData.daily || {};            // EMA, RSI, MACD, ATR, Bollinger, S/R

    // ✅ Feature Generator call
    const fg = new FeatureGenerator();
    const features = fg.generateAllFeatures(marketData, indicators);

    console.log("\n=== Generated ML Features (Step 2.4 Output) ===");
    console.log(features);

  } catch (error) {
    console.error("Error running feature generator test:", error);
  }
})();
