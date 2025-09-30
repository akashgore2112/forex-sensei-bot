// ml-pipeline/test/test-features.js
const FeatureGenerator = require('../feature-engineering/feature-generator');

// Dummy input (tum Phase 1 MTFA + candle data pass karoge yaha)
const candles = [
  { open: 1.10, high: 1.12, low: 1.09, close: 1.11, volume: 1000 },
  { open: 1.11, high: 1.13, low: 1.10, close: 1.12, volume: 1200 },
  { open: 1.12, high: 1.14, low: 1.11, close: 1.13, volume: 1100 }
];

const indicators = {
  ema20: [{ value: 1.115 }],
  ema50: [{ value: 1.110 }],
  ema200: [{ value: 1.100 }],
  rsi: [{ value: 56 }],
  macd: {
    line: [{ value: 0.002 }],
    signal: [{ value: 0.001 }],
    histogram: [{ value: 0.001 }]
  },
  atr: [{ value: 0.008 }],
  bollingerBands: {
    upper: [{ value: 1.14 }],
    middle: [{ value: 1.12 }],
    lower: [{ value: 1.10 }]
  }
};

async function runTest() {
  const generator = new FeatureGenerator();
  const features = generator.generateAllFeatures(candles, indicators);

  console.log("✅ Generated Features:");
  console.log(features);

  // Basic sanity checks
  console.log("\n🔍 Validation:");
  console.log("NaN check:", Object.values(features).some(v => isNaN(v)) ? "❌ FAIL" : "✅ PASS");
  console.log("Keys count:", Object.keys(features).length);
}

runTest();
