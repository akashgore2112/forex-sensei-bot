// test/test-pullback-detector.js
const PullbackDetector = require('../trading-patterns/pullback-detector');

function testPullbackDetector() {
  console.log("=== Testing Pullback Detector ===\n");

  const detector = new PullbackDetector();

  // Helper: add separator for clarity
  const separator = () => console.log("--------------------------------------------------");

  // Test 1: Valid BUY pullback (price touches level, forms higher low)
  console.log("Test 1: Valid BUY pullback");
  separator();

  const buyCandles = [
    // Price coming down to engulfing level (1.0850)
    { timestamp: '2024-01-10T00:00:00Z', open: 1.0900, high: 1.0910, low: 1.0890, close: 1.0895 },
    { timestamp: '2024-01-10T01:00:00Z', open: 1.0895, high: 1.0900, low: 1.0880, close: 1.0885 },
    { timestamp: '2024-01-10T02:00:00Z', open: 1.0885, high: 1.0890, low: 1.0870, close: 1.0875 },
    { timestamp: '2024-01-10T03:00:00Z', open: 1.0875, high: 1.0880, low: 1.0860, close: 1.0865 },
    // Touch the level (1.0850 ± 0.1%)
    { timestamp: '2024-01-10T04:00:00Z', open: 1.0865, high: 1.0870, low: 1.0849, close: 1.0852 },
    // Form higher low
    { timestamp: '2024-01-10T05:00:00Z', open: 1.0852, high: 1.0860, low: 1.0851, close: 1.0858 }, // Low > previous
    { timestamp: '2024-01-10T06:00:00Z', open: 1.0858, high: 1.0870, low: 1.0855, close: 1.0868 }  // Bullish close
  ];

  const engulfingLevel = 1.0850;
  const rsi = 50; // Within 40-60

  console.log(`[DEBUG] Calling detector.isPullbackComplete() for BUY`);
  const buyResult = detector.isPullbackComplete(buyCandles, engulfingLevel, "BUY", rsi);

  if (buyResult) {
    console.log("✓ BUY pullback detected");
    console.log(`  Pattern: ${buyResult.pattern}`);
    console.log(`  RSI: ${buyResult.rsi.toFixed(1)}`);
    console.log(`  Reason: ${buyResult.reason}`);
  } else {
    console.log("✗ No BUY pullback detected (expected to detect)");
  }

  separator();

  // Test 2: Price touches but RSI extreme (should fail)
  console.log("Test 2: Price touches but RSI too high");
  separator();

  const extremeRSI = 70;
  console.log(`[DEBUG] Calling detector.isPullbackComplete() with RSI=${extremeRSI}`);
  const result2 = detector.isPullbackComplete(buyCandles, engulfingLevel, "BUY", extremeRSI);

  if (result2) {
    console.log("✗ Pullback detected (should reject - RSI extreme)");
  } else {
    console.log("✓ Correctly rejected (RSI too high)");
  }

  separator();

  // Test 3: Valid SELL pullback
  console.log("Test 3: Valid SELL pullback");
  separator();

  const sellCandles = [
    // Price coming up to engulfing level (1.0950)
    { timestamp: '2024-01-11T00:00:00Z', open: 1.0900, high: 1.0910, low: 1.0890, close: 1.0905 },
    { timestamp: '2024-01-11T01:00:00Z', open: 1.0905, high: 1.0920, low: 1.0900, close: 1.0915 },
    { timestamp: '2024-01-11T02:00:00Z', open: 1.0915, high: 1.0930, low: 1.0910, close: 1.0925 },
    { timestamp: '2024-01-11T03:00:00Z', open: 1.0925, high: 1.0940, low: 1.0920, close: 1.0935 },
    // Touch the level (1.0950 ± 0.1%)
    { timestamp: '2024-01-11T04:00:00Z', open: 1.0935, high: 1.0951, low: 1.0930, close: 1.0948 },
    // Form lower high
    { timestamp: '2024-01-11T05:00:00Z', open: 1.0948, high: 1.0949, low: 1.0940, close: 1.0942 }, // High < previous
    { timestamp: '2024-01-11T06:00:00Z', open: 1.0942, high: 1.0945, low: 1.0930, close: 1.0932 }  // Bearish close
  ];

  const sellEngulfingLevel = 1.0950;
  const sellRsi = 45;

  console.log(`[DEBUG] Calling detector.isPullbackComplete() for SELL`);
  const sellResult = detector.isPullbackComplete(sellCandles, sellEngulfingLevel, "SELL", sellRsi);

  if (sellResult) {
    console.log("✓ SELL pullback detected");
    console.log(`  Pattern: ${sellResult.pattern}`);
    console.log(`  RSI: ${sellResult.rsi.toFixed(1)}`);
    console.log(`  Reason: ${sellResult.reason}`);
  } else {
    console.log("✗ No SELL pullback detected (expected to detect)");
  }

  separator();

  // Test 4: Price never touches level
  console.log("Test 4: Price doesn't reach level");
  separator();

  const noTouchCandles = [
    ...Array(10).fill(null).map((_, i) => ({
      timestamp: new Date(Date.parse('2024-01-12T00:00:00Z') + i * 60 * 60 * 1000).toISOString(),
      open: 1.0900,
      high: 1.0910,
      low: 1.0890,
      close: 1.0900
    }))
  ];

  console.log(`[DEBUG] Calling detector.isPullbackComplete() for no-touch scenario`);
  const result4 = detector.isPullbackComplete(noTouchCandles, 1.0850, "BUY", 50);

  if (result4) {
    console.log("✗ Pullback detected (should reject - no touch)");
  } else {
    console.log("✓ Correctly rejected (price never touched level)");
  }

  console.log("\n=== Pullback Detector Test Complete ===");
}

testPullbackDetector();
