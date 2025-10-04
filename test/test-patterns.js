// test/test-patterns.js
const SwingDetector = require('../trading-patterns/swing-detector');
const EngulfingDetector = require('../trading-patterns/engulfing-detector');
const PullbackDetector = require('../trading-patterns/pullback-detector');

console.log("=== Phase 2.4: Pattern Integration Test ===\n");

// Initialize detectors
const swingDetector = new SwingDetector();
const engulfingDetector = new EngulfingDetector(swingDetector);
const pullbackDetector = new PullbackDetector();

// === SCENARIO 1: Complete Bullish Setup ===
console.log("Scenario 1: Complete Bullish Setup");

// 4H candles (swing + engulfing)
const candles4H = [
  { timestamp: '2024-01-01T00:00:00Z', open: 1.090, high: 1.091, low: 1.089, close: 1.090 },
  { timestamp: '2024-01-01T04:00:00Z', open: 1.091, high: 1.092, low: 1.090, close: 1.091 },
  { timestamp: '2024-01-01T08:00:00Z', open: 1.091, high: 1.093, low: 1.080, close: 1.082 }, // swing low
  { timestamp: '2024-01-01T12:00:00Z', open: 1.082, high: 1.085, low: 1.081, close: 1.083 },
  { timestamp: '2024-01-01T16:00:00Z', open: 1.083, high: 1.084, low: 1.083, close: 1.084 },
  { timestamp: '2024-01-01T20:00:00Z', open: 1.084, high: 1.095, low: 1.083, close: 1.096 }  // bullish engulfing
];

const indicators = { adx: Array(candles4H.length).fill(25) };

const swings = swingDetector.findSwingLows(candles4H, 2);
const engulfing = engulfingDetector.detectBullishEngulfing(candles4H, indicators);
const engulfingLevel = 1.0850;

// ✅ Fixed: 10 candles on 1H timeframe (pullback forms higher low)
const candles1H = [
  { timestamp: '2024-01-10T00:00:00Z', open: 1.0900, high: 1.0910, low: 1.0890, close: 1.0895 },
  { timestamp: '2024-01-10T01:00:00Z', open: 1.0895, high: 1.0900, low: 1.0880, close: 1.0885 },
  { timestamp: '2024-01-10T02:00:00Z', open: 1.0885, high: 1.0890, low: 1.0870, close: 1.0875 },
  { timestamp: '2024-01-10T03:00:00Z', open: 1.0875, high: 1.0880, low: 1.0860, close: 1.0865 },
  { timestamp: '2024-01-10T04:00:00Z', open: 1.0865, high: 1.0870, low: 1.0849, close: 1.0852 },
  { timestamp: '2024-01-10T05:00:00Z', open: 1.0852, high: 1.0860, low: 1.0851, close: 1.0858 },
  { timestamp: '2024-01-10T06:00:00Z', open: 1.0858, high: 1.0870, low: 1.0855, close: 1.0868 },
  { timestamp: '2024-01-10T07:00:00Z', open: 1.0868, high: 1.0880, low: 1.0865, close: 1.0878 },
  { timestamp: '2024-01-10T08:00:00Z', open: 1.0878, high: 1.0890, low: 1.0870, close: 1.0888 },
  { timestamp: '2024-01-10T09:00:00Z', open: 1.0888, high: 1.0900, low: 1.0875, close: 1.0898 } // forms higher low, bullish
];

const rsi = 50;

const pullback = pullbackDetector.isPullbackComplete(candles1H, engulfingLevel, "BUY", rsi);

const result1 = {
  swingDetected: swings.length > 0,
  engulfingDetected: !!engulfing,
  pullbackComplete: !!pullback,
  details: { swings, engulfing, pullback }
};
console.log("Result 1:", result1);

// === SCENARIO 2: Engulfing but no pullback ===
console.log("\nScenario 2: Engulfing but no pullback");

const candles1H_noPullback = [
  { open: 1.092, high: 1.094, low: 1.091, close: 1.093 },
  { open: 1.093, high: 1.095, low: 1.092, close: 1.094 }
];
const result2 = {
  swingDetected: swings.length > 0,
  engulfingDetected: !!engulfing,
  pullbackComplete: !!pullbackDetector.isPullbackComplete(candles1H_noPullback, engulfingLevel, "BUY", rsi)
};
console.log("Result 2:", result2);

// === SCENARIO 3: Pullback but no higher low ===
console.log("\nScenario 3: Pullback but no higher low");

const candles1H_noHigherLow = [
  { open: 1.090, high: 1.091, low: 1.089, close: 1.089 },
  { open: 1.089, high: 1.090, low: 1.085, close: 1.086 },
  { open: 1.086, high: 1.087, low: 1.083, close: 1.084 }
];
const result3 = {
  swingDetected: swings.length > 0,
  engulfingDetected: !!engulfing,
  pullbackComplete: !!pullbackDetector.isPullbackComplete(candles1H_noHigherLow, engulfingLevel, "BUY", rsi)
};
console.log("Result 3:", result3);

console.log("\n=== Pattern Integration Test Complete ===");
