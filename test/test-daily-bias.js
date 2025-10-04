// test/test-daily-bias.js  
const DailyBiasFilter = require('../mtf-setups/daily-bias-filter');  
  
function testDailyBiasFilter() {  
  console.log("=== Phase 3.1: Daily Bias Filter Test ===\n");  
  
  const filter = new DailyBiasFilter();  
  
  // Test 1: Clear BULLISH bias (EMA20 > EMA50 + 0.2%)  
  console.log("Test 1: BULLISH bias");  
    
  const bullishCandles = Array(50).fill(null).map((_, i) => ({  
    timestamp: new Date(Date.parse('2024-01-01T00:00:00Z') + i * 24 * 60 * 60 * 1000).toISOString(),  
    open: 1.08,  
    high: 1.081,  
    low: 1.079,  
    close: 1.080  
  }));  
  
  const bullishIndicators = {  
    ema20: Array(50).fill(1.0850),  
    ema50: Array(50).fill(1.0830) // EMA20 is 0.185% above EMA50  
  };  
  
  const result1 = filter.getBias(bullishCandles, bullishIndicators);  
    
  console.log(`Bias: ${result1.bias}`);  
  console.log(`EMA20: ${result1.ema20}, EMA50: ${result1.ema50}`);  
  console.log(`Separation: ${result1.separation}%`);  
  console.log(`Valid: ${result1.valid}`);  
  console.log(`Reason: ${result1.reason}`);  
  console.log(result1.bias === "BULLISH" ? "✓ PASS" : "✗ FAIL");  
  
  // Test 2: Clear BEARISH bias  
  console.log("\nTest 2: BEARISH bias");  
    
  const bearishIndicators = {  
    ema20: Array(50).fill(1.0830),  
    ema50: Array(50).fill(1.0850) // EMA20 is 0.185% below EMA50  
  };  
  
  const result2 = filter.getBias(bullishCandles, bearishIndicators);  
    
  console.log(`Bias: ${result2.bias}`);  
  console.log(`Separation: ${result2.separation}%`);  
  console.log(`Valid: ${result2.valid}`);  
  console.log(result2.bias === "BEARISH" ? "✓ PASS" : "✗ FAIL");  
  
  // Test 3: NEUTRAL (EMAs too close)  
  console.log("\nTest 3: NEUTRAL bias (EMAs within 0.1%)");  
    
  const neutralIndicators = {  
    ema20: Array(50).fill(1.0850),  
    ema50: Array(50).fill(1.0849) // Only 0.009% apart  
  };  
  
  const result3 = filter.getBias(bullishCandles, neutralIndicators);  
    
  console.log(`Bias: ${result3.bias}`);  
  console.log(`Separation: ${result3.separation}%`);  
  console.log(`Valid: ${result3.valid}`);  
  console.log(result3.bias === "NEUTRAL" ? "✓ PASS" : "✗ FAIL");  
  
  // Test 4: Tradeable check  
  console.log("\nTest 4: Tradeable check");  
  console.log(`Bullish tradeable: ${filter.isTradeable(result1)} (expected: true)`);  
  console.log(`Bearish tradeable: ${filter.isTradeable(result2)} (expected: true)`);  
  console.log(`Neutral tradeable: ${filter.isTradeable(result3)} (expected: false)`);  
  
  console.log("\n=== Daily Bias Filter Test Complete ===");  
}  
  
testDailyBiasFilter();
