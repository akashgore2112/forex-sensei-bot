// test/test-mtf-orchestrator.js  
const MTFSetupOrchestrator = require('../mtf-setups/mtf-setup-orchestrator');  
  
function testOrchestrator() {  
  console.log("=== Phase 3.4: MTF Orchestrator Test ===\n");  
  
  const orchestrator = new MTFSetupOrchestrator();  
  
  // Prepare data for all timeframes  
  const dailyCandles = Array(50).fill(null).map((_, i) => ({  
    timestamp: new Date(Date.parse('2024-01-01T00:00:00Z') + i * 24 * 60 * 60 * 1000).toISOString(),  
    open: 1.08,  
    high: 1.081,  
    low: 1.079,  
    close: 1.080  
  }));  
  
  const fourHCandles = [  
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
  
  const oneHCandles = [  
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
  
  const indicators = {  
    dailyIndicators: {  
      ema20: Array(50).fill(1.0850),  
      ema50: Array(50).fill(1.0830)  
    },  
    fourHIndicators: {  
      adx: Array(fourHCandles.length).fill(25)  
    },  
    oneHIndicators: {  
      rsi: Array(oneHCandles.length).fill(50),  
      atr: Array(oneHCandles.length).fill(0.0015)  
    }  
  };  
  
  // Test 1: Complete flow  
  console.log("Test 1: Complete flow (Daily → 4H → 1H)");  
    
  const result1 = orchestrator.scanForSetup({  
    daily: dailyCandles,  
    fourH: fourHCandles,  
    oneH: oneHCandles  
  }, indicators);  
  
  console.log(`Stage: ${result1.stage}`);  
  console.log(`Ready: ${result1.ready}`);  
  console.log(`Daily Bias: ${result1.dailyBias.bias}`);  
  console.log(`4H Setup: ${result1.setup4H ? result1.setup4H.detected : 'N/A'}`);  
  console.log(`1H Entry: ${result1.entry1H ? result1.entry1H.entryReady : 'N/A'}`);  
  console.log(`Reason: ${result1.reason}`);  
  console.log(result1.ready && result1.entry1H.entryReady ? "✓ PASS" : "✗ FAIL");  
  
  // Test 2: NEUTRAL daily bias  
  console.log("\nTest 2: NEUTRAL daily bias blocks everything");  
    
  const neutralIndicators = {  
    ...indicators,  
    dailyIndicators: {  
      ema20: Array(50).fill(1.0850),  
      ema50: Array(50).fill(1.0849)  
    }  
  };  
  
  const result2 = orchestrator.scanForSetup({  
    daily: dailyCandles,  
    fourH: fourHCandles,  
    oneH: oneHCandles  
  }, neutralIndicators);  
  
  console.log(`Stage: ${result2.stage}`);  
  console.log(`Daily Bias: ${result2.dailyBias.bias}`);  
  console.log(`Ready: ${result2.ready}`);  
  console.log(result2.stage === "DAILY_BIAS" && !result2.ready ? "✓ PASS" : "✗ FAIL");  
  
  // Test 3: Active setup tracking  
  console.log("\nTest 3: Active setup tracking");  
  console.log(`Has active setup: ${orchestrator.hasActiveSetup()}`);  
  console.log("(Should be false after Test 1 completed entry)");  
  
  console.log("\n=== MTF Orchestrator Test Complete ===");  
}  
  
testOrchestrator();
