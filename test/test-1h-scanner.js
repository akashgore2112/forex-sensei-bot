// test/test-1h-scanner.js  
const OneHourEntryScanner = require('../mtf-setups/1h-entry-scanner');  
  
function test1HScanner() {  
  console.log("=== Phase 3.3: 1H Entry Scanner Test ===\n");  
  
  const scanner = new OneHourEntryScanner();  
  
  // Valid 4H setup  
  const setup4H = {  
    detected: true,  
    direction: "BUY",  
    engulfingLevel: 1.0850,  
    adx: 25  
  };  
  
  // Test 1: Valid entry (pullback complete)  
  console.log("Test 1: Valid entry signal");  
    
  const candles1H = [  
    { timestamp: '2024-01-10T00:00:00Z', open: 1.0900, high: 1.0910, low: 1.0890, close: 1.0895 },  
    { timestamp: '2024-01-10T01:00:00Z', open: 1.0895, high: 1.0900, low: 1.0880, close: 1.0885 },  
    { timestamp: '2024-01-10T02:00:00Z', open: 1.0885, high: 1.0890, low: 1.0870, close: 1.0875 },  
    { timestamp: '2024-01-10T03:00:00Z', open: 1.0875, high: 1.0880, low: 1.0860, close: 1.0865 },  
    { timestamp: '2024-01-10T04:00:00Z', open: 1.0865, high: 1.0870, low: 1.0849, close: 1.0852 },  
    { timestamp: '2024-01-10T05:00:00Z', open: 1.0852, high: 1.0860, low: 1.0851, close: 1.0858 },  
    { timestamp: '2024-01-10T06:00:00Z', open: 1.0858, high: 1.0870, low: 1.0855, close: 1.0868 },  
    { timestamp: '2024-01-10T07:00:00Z', open: 1.0868, high: 1.0880, low: 1.0862, close: 1.0875 },  
    { timestamp: '2024-01-10T08:00:00Z', open: 1.0875, high: 1.0890, low: 1.0870, close: 1.0885 },  
    { timestamp: '2024-01-10T09:00:00Z', open: 1.0885, high: 1.0900, low: 1.0880, close: 1.0895 }  
  ];  
  
  const indicators1H = {  
    rsi: Array(candles1H.length).fill(50),  
    atr: Array(candles1H.length).fill(0.0015) // Below 0.0018 → 1.5R  
  };  
  
  const result1 = scanner.scanForEntry(candles1H, indicators1H, setup4H);  
    
  console.log(`Entry ready: ${result1.entryReady}`);  
  console.log(`Direction: ${result1.direction}`);  
  console.log(`Entry: ${result1.entry}`);  
  console.log(`Stop Loss: ${result1.stopLoss}`);  
  console.log(`Take Profit: ${result1.takeProfit}`);  
  console.log(`Risk:Reward: ${result1.riskReward}:1`);  
  console.log(`Pattern: ${result1.pattern}`);  
  console.log(result1.entryReady ? "✓ PASS" : "✗ FAIL");  
  
  // Test 2: High ATR → 2R target  
  console.log("\nTest 2: High ATR (should use 2R)");  
    
  const indicators1H_highATR = {  
    rsi: Array(candles1H.length).fill(50),  
    atr: Array(candles1H.length).fill(0.0020) // Above 0.0018 → 2R  
  };  
  
  const result2 = scanner.scanForEntry(candles1H, indicators1H_highATR, setup4H);  
    
  console.log(`Risk:Reward: ${result2.riskReward}:1`);  
  console.log(result2.riskReward === 2.0 ? "✓ PASS (2R target)" : "✗ FAIL");  
  
  // Test 3: High ADX → 2R target  
  console.log("\nTest 3: High ADX (should use 2R)");  
    
  const setup4H_highADX = {  
    detected: true,  
    direction: "BUY",  
    engulfingLevel: 1.0850,  
    adx: 30 // ADX > 25 → 2R  
  };  
  
  const result3 = scanner.scanForEntry(candles1H, indicators1H, setup4H_highADX);  
    
  console.log(`Risk:Reward: ${result3.riskReward}:1`);  
  console.log(result3.riskReward === 2.0 ? "✓ PASS (2R target)" : "✗ FAIL");  
  
  // Test 4: No 4H setup  
  console.log("\nTest 4: Rejected (no 4H setup)");  
    
  const result4 = scanner.scanForEntry(candles1H, indicators1H, null);  
    
  console.log(`Entry ready: ${result4.entryReady}`);  
  console.log(`Reason: ${result4.reason}`);  
  console.log(!result4.entryReady ? "✓ PASS (correctly rejected)" : "✗ FAIL");  
  
  console.log("\n=== 1H Entry Scanner Test Complete ===");  
}  
  
test1HScanner();
