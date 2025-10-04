// test/test-4h-scanner.js  
const FourHourSetupScanner = require('../mtf-setups/4h-setup-scanner');  
  
function test4HScanner() {  
  console.log("=== Phase 3.2: 4H Setup Scanner Test ===\n");  
  
  const scanner = new FourHourSetupScanner();  
  
  // Create 4H candles with engulfing  
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
    { timestamp: '2024-01-09T04:00:00Z', open: 1.083, high: 1.097, low: 1.082, close: 1.096 }  
  ];  
  
  const indicators4H = { adx: Array(candles4H.length).fill(25) };  
  
  // Test 1: Valid setup (BULLISH daily + BUY engulfing)  
  console.log("Test 1: Valid setup (daily BULLISH + BUY engulfing)");  
    
  const bullishBias = {  
    bias: "BULLISH",  
    valid: true,  
    ema20: 1.085,  
    ema50: 1.083  
  };  
  
  const result1 = scanner.scanForSetup(candles4H, indicators4H, bullishBias);  
    
  console.log(`Detected: ${result1.detected}`);  
  console.log(`Direction: ${result1.direction}`);  
  console.log(`Engulfing level: ${result1.engulfingLevel ? result1.engulfingLevel.toFixed(5) : 'N/A'}`);  
  console.log(`Reason: ${result1.reason}`);  
  console.log(result1.detected && result1.direction === "BUY" ? "✓ PASS" : "✗ FAIL");  
  
  // Test 2: Rejected (BEARISH daily conflicts with BUY engulfing)  
  console.log("\nTest 2: Rejected (bias mismatch)");  
    
  const bearishBias = {  
    bias: "BEARISH",  
    valid: true,  
    ema20: 1.083,  
    ema50: 1.085  
  };  
  
  const result2 = scanner.scanForSetup(candles4H, indicators4H, bearishBias);  
    
  console.log(`Detected: ${result2.detected}`);  
  console.log(`Reason: ${result2.reason}`);  
  console.log(!result2.detected ? "✓ PASS (correctly rejected)" : "✗ FAIL");  
  
  // Test 3: Rejected (NEUTRAL daily)  
  console.log("\nTest 3: Rejected (NEUTRAL daily bias)");  
    
  const neutralBias = {  
    bias: "NEUTRAL",  
    valid: false,  
    ema20: 1.085,  
    ema50: 1.0849  
  };  
  
  const result3 = scanner.scanForSetup(candles4H, indicators4H, neutralBias);  
    
  console.log(`Detected: ${result3.detected}`);  
  console.log(`Reason: ${result3.reason}`);  
  console.log(!result3.detected ? "✓ PASS (correctly rejected)" : "✗ FAIL");  
  
  console.log("\n=== 4H Setup Scanner Test Complete ===");  
}  
  
test4HScanner();
