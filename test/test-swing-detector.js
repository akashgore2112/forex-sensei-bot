// test/test-swing-detector.js
const SwingDetector = require('../trading-patterns/swing-detector');

function testSwingDetector() {
  console.log("=== Testing Swing Detector ===\n");

  // Create sample candles with obvious swings
  const candles = [
    // Building up to swing high
    { timestamp: '2024-01-01T00:00:00Z', open: 1.08, high: 1.081, low: 1.079, close: 1.080 },
    { timestamp: '2024-01-01T04:00:00Z', open: 1.080, high: 1.082, low: 1.080, close: 1.081 },
    { timestamp: '2024-01-01T08:00:00Z', open: 1.081, high: 1.083, low: 1.081, close: 1.082 },
    { timestamp: '2024-01-01T12:00:00Z', open: 1.082, high: 1.085, low: 1.082, close: 1.084 },
    { timestamp: '2024-01-01T16:00:00Z', open: 1.084, high: 1.088, low: 1.084, close: 1.087 },
    // SWING HIGH at index 5
    { timestamp: '2024-01-01T20:00:00Z', open: 1.087, high: 1.095, low: 1.087, close: 1.094 },
    // Coming down
    { timestamp: '2024-01-02T00:00:00Z', open: 1.094, high: 1.094, low: 1.091, close: 1.092 },
    { timestamp: '2024-01-02T04:00:00Z', open: 1.092, high: 1.093, low: 1.089, close: 1.090 },
    { timestamp: '2024-01-02T08:00:00Z', open: 1.090, high: 1.091, low: 1.087, close: 1.088 },
    { timestamp: '2024-01-02T12:00:00Z', open: 1.088, high: 1.089, low: 1.085, close: 1.086 },
    { timestamp: '2024-01-02T16:00:00Z', open: 1.086, high: 1.087, low: 1.083, close: 1.084 },
    // SWING LOW at index 11
    { timestamp: '2024-01-02T20:00:00Z', open: 1.084, high: 1.085, low: 1.078, close: 1.079 },
    // Going back up
    { timestamp: '2024-01-03T00:00:00Z', open: 1.079, high: 1.082, low: 1.079, close: 1.081 },
    { timestamp: '2024-01-03T04:00:00Z', open: 1.081, high: 1.084, low: 1.081, close: 1.083 },
    { timestamp: '2024-01-03T08:00:00Z', open: 1.083, high: 1.086, low: 1.083, close: 1.085 },
    { timestamp: '2024-01-03T12:00:00Z', open: 1.085, high: 1.088, low: 1.085, close: 1.087 },
    { timestamp: '2024-01-03T16:00:00Z', open: 1.087, high: 1.090, low: 1.087, close: 1.089 },
    // Filler for lookback
    ...Array(10).fill(null).map((_, i) => ({
      timestamp: new Date(Date.parse('2024-01-03T20:00:00Z') + i * 4 * 60 * 60 * 1000).toISOString(),
      open: 1.089,
      high: 1.091,
      low: 1.088,
      close: 1.090
    }))
  ];

  const detector = new SwingDetector(5); // Use lookback of 5 for small dataset

  console.log("Test 1: Find all swing highs");
  const swingHighs = detector.findSwingHighs(candles);
  console.log(`Found ${swingHighs.length} swing high(s):`);
  swingHighs.forEach(swing => {
    console.log(`  Index ${swing.index}: ${swing.price.toFixed(5)} at ${swing.timestamp}`);
  });

  console.log("\nTest 2: Find all swing lows");
  const swingLows = detector.findSwingLows(candles);
  console.log(`Found ${swingLows.length} swing low(s):`);
  swingLows.forEach(swing => {
    console.log(`  Index ${swing.index}: ${swing.price.toFixed(5)} at ${swing.timestamp}`);
  });

  console.log("\nTest 3: Get latest swings");
  const latest = detector.getLatestSwings(candles);
  console.log(`Latest swing high: ${latest.high ? latest.high.price.toFixed(5) : 'None'}`);
  console.log(`Latest swing low: ${latest.low ? latest.low.price.toFixed(5) : 'None'}`);

  console.log("\n=== Swing Detector Test Complete ===");
  console.log("\nExpected results:");
  console.log("- Should find swing high around index 5 (price ~1.095)");
  console.log("- Should find swing low around index 11 (price ~1.078)");
}

testSwingDetector();
