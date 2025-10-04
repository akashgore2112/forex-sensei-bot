// test/test-engulfing-detector.js
const EngulfingDetector = require('../trading-patterns/engulfing-detector');

function testEngulfingDetector() {
  console.log("=== Testing Engulfing Detector ===\n");

  // Test 1: Valid bullish engulfing with swing break
  console.log("Test 1: Valid bullish engulfing");
  
  const candles1 = [
    // Build up to swing high
    ...Array(25).fill(null).map((_, i) => ({
      timestamp: new Date(Date.parse('2024-01-01T00:00:00Z') + i * 4 * 60 * 60 * 1000).toISOString(),
      open: 1.080 + (i * 0.0002),
      high: 1.081 + (i * 0.0002),
      low: 1.079 + (i * 0.0002),
      close: 1.080 + (i * 0.0002)
    })),
    // Swing high at index 25
    { timestamp: '2024-01-05T00:00:00Z', open: 1.088, high: 1.095, low: 1.088, close: 1.094 },
    // Pull back
    ...Array(20).fill(null).map((_, i) => ({
      timestamp: new Date(Date.parse('2024-01-05T04:00:00Z') + i * 4 * 60 * 60 * 1000).toISOString(),
      open: 1.094 - (i * 0.0003),
      high: 1.095 - (i * 0.0003),
      low: 1.092 - (i * 0.0003),
      close: 1.093 - (i * 0.0003)
    })),
    // Engulfing formation
    { timestamp: '2024-01-08T20:00:00Z', open: 1.086, high: 1.087, low: 1.083, close: 1.084 }, // Bearish
    { timestamp: '2024-01-09T00:00:00Z', open: 1.083, high: 1.097, low: 1.082, close: 1.096 }  // Bullish engulfing, breaks swing high
  ];

  const indicators1 = {
    adx: Array(candles1.length).fill(25) // ADX > 20
  };

  const detector = new EngulfingDetector();
  const result1 = detector.detect(candles1, indicators1);
  
  if (result1) {
    console.log("✓ Bullish engulfing detected");
    console.log(`  Type: ${result1.type}`);
    console.log(`  Direction: ${result1.direction}`);
    console.log(`  Close: ${result1.candle.close.toFixed(5)}`);
    console.log(`  Swing broken: ${result1.swingBroken.price.toFixed(5)}`);
    console.log(`  ADX: ${result1.adx.toFixed(1)}`);
  } else {
    console.log("✗ No engulfing detected (expected to detect)");
  }

  // Test 2: Engulfing but no swing break (should fail)
  console.log("\nTest 2: Engulfing without swing break");
  
  const candles2 = [
    ...Array(50).fill(null).map((_, i) => ({
      timestamp: new Date(Date.parse('2024-01-01T00:00:00Z') + i * 4 * 60 * 60 * 1000).toISOString(),
      open: 1.085,
      high: 1.086,
      low: 1.084,
      close: 1.085
    })),
    { timestamp: '2024-01-10T00:00:00Z', open: 1.086, high: 1.087, low: 1.083, close: 1.084 }, // Bearish
    { timestamp: '2024-01-10T04:00:00Z', open: 1.083, high: 1.088, low: 1.082, close: 1.087 }  // Bullish but doesn't break swing
  ];

  const indicators2 = {
    adx: Array(candles2.length).fill(25)
  };

  const result2 = detector.detect(candles2, indicators2);
  
  if (result2) {
    console.log("✗ Engulfing detected (should not detect - no swing break)");
  } else {
    console.log("✓ Correctly rejected (no swing break)");
  }

  // Test 3: Low ADX (should fail)
  console.log("\nTest 3: Engulfing with low ADX");
  
  const indicators3 = {
    adx: Array(candles1.length).fill(15) // ADX too low
  };

  const result3 = detector.detect(candles1, indicators3);
  
  if (result3) {
    console.log("✗ Engulfing detected (should not detect - low ADX)");
  } else {
    console.log("✓ Correctly rejected (ADX too low)");
  }

  console.log("\n=== Engulfing Detector Test Complete ===");
}

testEngulfingDetector();
