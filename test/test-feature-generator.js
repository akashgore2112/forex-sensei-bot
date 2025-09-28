const MTFA = require('../mtfa');
const FeatureGenerator = require('../ml-pipeline/feature-engineering/feature-generator');

(async () => {
  try {
    const pair = "EUR/USD";
    const mtfaData = await MTFA.analyze(pair);

    console.log("\n=== RAW MTFA OUTPUT KEYS ===");
    console.log(Object.keys(mtfaData));

    console.log("\n=== Keys inside mtfaData.daily ===");
    console.log(Object.keys(mtfaData.daily));

    // ✅ Check last 5 candles (rawData)
    if (mtfaData.daily?.rawData) {
      console.log("\n=== Last 5 Daily Candles (rawData) ===");
      console.log(mtfaData.daily.rawData.slice(-5));
    } else {
      console.log("\n⚠️ No rawData found in mtfaData.daily!");
    }

    // ✅ Indicators + raw OHLC candles dono pass karna
    const marketData = mtfaData.daily?.rawData || [];
    const indicators = mtfaData.daily || {};

    // ✅ Run Feature Generator
    const fg = new FeatureGenerator();
    const features = fg.generateAllFeatures(marketData, indicators);

    console.log("\n=== Generated ML Features (Step 2.4 Output) ===");
    console.log(features);

    // ✅ Extra check for pattern + statistical features
    console.log("\nPattern Features:", {
      higher_highs: features.higher_highs,
      higher_lows: features.higher_lows,
      breakout_pattern: features.breakout_pattern
    });

    console.log("\nStatistical Features:", {
      z_score: features.z_score,
      rolling_mean: features.rolling_mean,
      rolling_std: features.rolling_std
    });

    console.log("\nSupport/Resistance Features:", {
      support_strength: features.support_strength,
      resistance_strength: features.resistance_strength
    });

  } catch (error) {
    console.error("❌ Error running feature generator test:", error);
  }
})();
