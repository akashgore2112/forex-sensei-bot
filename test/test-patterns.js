// test/test-patterns.js
const SwingDetector = require('../trading-patterns/swing-detector');
const EngulfingDetector = require('../trading-patterns/engulfing-detector');
const PullbackDetector = require('../trading-patterns/pullback-detector');

function testPatternIntegration() {
  console.log("=== Phase 2.4: Pattern Integration Test ===\n");

  const swingDetector = new SwingDetector(20);
  const engulfingDetector = new EngulfingDetector();
  const pullbackDetector = new PullbackDetector();

  // ---------- SCENARIO 1: Complete Bullish Setup ----------
  console.log("Scenario 1: Complete Bullish Setup\n");

  // 4H candles with swing low at 1.0800, bullish engulfing breaking swing high
  const candles4H = [
    ...Array(25).fill(null).map((_, i) => ({
      timestamp: new Date(Date.parse('2024-01-01T00:00:00Z') + i * 4 * 60 * 60 * 1000).toISOString(),
      open: 1.080 + (i * 0.0002),
      high: 1.081 + (i * 0.0002),
      low: 1.079 + (i * 0.0002),
      close: 1.080 + (i * 0.0002)
    })),
    { timestamp: '2024-01-05T00:00:00Z', open: 1.088, high: 1.095, low: 1.088, close: 1.094 },
    ...Array(20).fill(null).map((_, i) => ({
      timestamp: new Date(Date.parse('2024-01-05T04:00:00Z') + i * 4 * 60 * 60 * 1000).toISOString(),
      open: 1.092 - (i * 0.0003),
      high: 1.093 - (i * 0.0003),
      low: 1.090 - (i * 0.0003),
      close: 1.091 - (i * 0.0003)
    })),
    { timestamp: '2024-01-08T16:00:00Z', open: 1.087, high: 1.088, low: 1.086, close: 1.087 },
    { timestamp: '2024-01-08T20:00:00Z', open: 1.087, high: 1.088, low: 1.085, close: 1.086 },
    { timestamp: '2024-01-09T00:00:00Z', open: 1.086, high: 1.087, low: 1.083, close: 1.084 },
    { timestamp: '2024-01-09T04:00:00Z', open: 1.083, high: 1.097, low: 1.082, close: 1.096 } // engulfing
  ];

  const indicators = { adx: Array(candles4H.length).fill(25) }; // ADX > 20
  const swings = swingDetector.findSwingHighs(candles4H, 20);
  const engulfing = engulfingDetector.detect(candles4H, indicators);

  // ✅ Fixed: Added 5 more candles to make total 10 for pullback detector
  const candles1H = [
    { timestamp: '2024-01-09T08:00:00Z', open: 1.090, high: 1.091, low: 1.089, close: 1.0895 },
    { timestamp: '2024-01-09T09:00:00Z', open: 1.0895, high: 1.090, low: 1.087, close: 1.0875 },
    { timestamp: '2024-01-09T10:00:00Z', open: 1.0875, high: 1.088, low: 1.085, close: 1.0855 },
    { timestamp: '2024-01-09T11:00:00Z', open: 1.0855, high: 1.086, low: 1.085, close: 1.0858 },
    { timestamp: '2024-01-09T12:00:00Z', open: 1.0858, high: 1.087, low: 1.0855, close: 1.0868 },
    { timestamp: '2024-01-09T13:00:00Z', open: 1.0868, high: 1.0878, low: 1.0860, close: 1.0875 },
    { timestamp: '2024-01-09T14:00:00Z', open: 1.0875, high: 1.0885, low: 1.0870, close: 1.0880 },
    { timestamp: '2024-01-09T15:00:00Z', open: 1.0880, high: 1.0890, low: 1.0875, close: 1.0888 },
    { timestamp: '2024-01-09T16:00:00Z', open: 1.0888, high: 1.0900, low: 1.0875, close: 1.0898 },
    { timestamp: '2024-01-09T17:00:00Z', open: 1.0898, high: 1.0910, low: 1.0885, close: 1.0905 } // higher low confirmed
  ];

  const pullback = pullbackDetector.isPullbackComplete(
    candles1H,
    1.0850,
    "BUY",
    50
  );

  const result1 = {
    swingDetected: swings.length > 0,
    engulfingDetected: !!engulfing,
    pullbackComplete: !!pullback,
    details: { swings, engulfing, pullback }
  };

  console.log("Result 1:", result1, "\n");

  // ---------- SCENARIO 2: No Pullback ----------
  console.log("Scenario 2: Engulfing but no pullback\n");

  const candles1H_noPullback = [
    { timestamp: '2024-01-10T00:00:00Z', open: 1.096, high: 1.097, low: 1.095, close: 1.096 },
    { timestamp: '2024-01-10T01:00:00Z', open: 1.096, high: 1.098, low: 1.095, close: 1.097 }
  ];

  const noPullback = pullbackDetector.isPullbackComplete(
    candles1H_noPullback,
    1.0850,
    "BUY",
    50
  );

  console.log("Result 2:", {
    swingDetected: swings.length > 0,
    engulfingDetected: !!engulfing,
    pullbackComplete: !!noPullback
  }, "\n");

  // ---------- SCENARIO 3: Pullback but no higher low ----------
  console.log("Scenario 3: Pullback but no higher low\n");

  const candles1H_noHigherLow = [
    { timestamp: '2024-01-11T00:00:00Z', open: 1.090, high: 1.091, low: 1.089, close: 1.0895 },
    { timestamp: '2024-01-11T01:00:00Z', open: 1.0895, high: 1.090, low: 1.086, close: 1.0875 },
    { timestamp: '2024-01-11T02:00:00Z', open: 1.0875, high: 1.088, low: 1.085, close: 1.0850 }, // keeps falling
    { timestamp: '2024-01-11T03:00:00Z', open: 1.0850, high: 1.086, low: 1.084, close: 1.0850 }
  ];

  const pullbackFail = pullbackDetector.isPullbackComplete(
    candles1H_noHigherLow,
    1.0850,
    "BUY",
    50
  );

  console.log("Result 3:", {
    swingDetected: swings.length > 0,
    engulfingDetected: !!engulfing,
    pullbackComplete: !!pullbackFail
  });

  console.log("\n=== Pattern Integration Test Complete ===");
}

testPatternIntegration();
