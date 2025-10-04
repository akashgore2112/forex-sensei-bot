// test/test-mtf-system.js
const MTFSetupOrchestrator = require('../mtf-setups/mtf-setup-orchestrator');

function testMTFSystem() {
  console.log("=== Phase 3.5: Complete MTF System Integration Test ===\n");

  // Common data setup
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

  // ========== SCENARIO 1: Complete Flow ==========
  console.log("Scenario 1: Complete Flow (Daily BULLISH → 4H Setup → 1H Entry)\n");
  
  const orchestrator1 = new MTFSetupOrchestrator();
  
  const oneHComplete = [
    { timestamp: '2024-01-10T00:00:00Z', open: 1.0900, high: 1.0910, low: 1.0890, close: 1.0895 },
    { timestamp: '2024-01-10T01:00:00Z', open: 1.0895, high: 1.0900, low: 1.0880, close: 1.0885 },
    { timestamp: '2024-01-10T02:00:00Z', open: 1.0885, high: 1.0890, low: 1.0860, close: 1.0875 },
    { timestamp: '2024-01-10T03:00:00Z', open: 1.0875, high: 1.0880, low: 1.0840, close: 1.0865 },
    { timestamp: '2024-01-10T04:00:00Z', open: 1.0865, high: 1.0870, low: 1.0819, close: 1.0822 },
    { timestamp: '2024-01-10T05:00:00Z', open: 1.0822, high: 1.0830, low: 1.0821, close: 1.0828 },
    { timestamp: '2024-01-10T06:00:00Z', open: 1.0828, high: 1.0850, low: 1.0825, close: 1.0848 },
    { timestamp: '2024-01-10T07:00:00Z', open: 1.0848, high: 1.0870, low: 1.0845, close: 1.0865 },
    { timestamp: '2024-01-10T08:00:00Z', open: 1.0865, high: 1.0880, low: 1.0860, close: 1.0875 },
    { timestamp: '2024-01-10T09:00:00Z', open: 1.0875, high: 1.0890, low: 1.0870, close: 1.0885 }
  ];

  const result1 = orchestrator1.scanForSetup({
    daily: dailyCandles,
    fourH: fourHCandles,
    oneH: oneHComplete
  }, {
    dailyIndicators: { ema20: Array(50).fill(1.0850), ema50: Array(50).fill(1.0830) },
    fourHIndicators: { adx: Array(fourHCandles.length).fill(25) },
    oneHIndicators: { rsi: Array(oneHComplete.length).fill(50), atr: Array(oneHComplete.length).fill(0.0015) }
  });

  console.log(`Stage: ${result1.stage}`);
  console.log(`Daily Bias: ${result1.dailyBias.bias}`);
  console.log(`4H Setup Detected: ${result1.setup4H?.detected}`);
  console.log(`1H Entry Ready: ${result1.entry1H?.entryReady}`);
  console.log(`Complete Signal: ${result1.ready}`);
  
  if (result1.ready && result1.entry1H?.entryReady) {
    console.log(`Entry: ${result1.entry1H.entry}`);
    console.log(`SL: ${result1.entry1H.stopLoss}`);
    console.log(`TP: ${result1.entry1H.takeProfit}`);
    console.log(`R:R: ${result1.entry1H.riskReward}:1`);
  }
  
  console.log("\n✓ Expected: Entry signal generated");
  console.log(result1.ready ? "✓ PASS\n" : "✗ FAIL\n");

  // ========== SCENARIO 2: Daily Bias Blocks Setup ==========
  console.log("Scenario 2: Daily Bias Mismatch (BEARISH daily vs BUY engulfing)\n");
  
  const orchestrator2 = new MTFSetupOrchestrator();
  
  const result2 = orchestrator2.scanForSetup({
    daily: dailyCandles,
    fourH: fourHCandles,
    oneH: oneHComplete
  }, {
    dailyIndicators: { ema20: Array(50).fill(1.0830), ema50: Array(50).fill(1.0850) }, // BEARISH
    fourHIndicators: { adx: Array(fourHCandles.length).fill(25) },
    oneHIndicators: { rsi: Array(oneHComplete.length).fill(50), atr: Array(oneHComplete.length).fill(0.0015) }
  });

  console.log(`Stage: ${result2.stage}`);
  console.log(`Daily Bias: ${result2.dailyBias.bias}`);
  console.log(`4H Setup Detected: ${result2.setup4H?.detected}`);
  console.log(`Reason: ${result2.reason}`);
  
  console.log("\n✓ Expected: Rejected at 4H stage (bias mismatch)");
  console.log(!result2.setup4H?.detected && result2.dailyBias.bias === "BEARISH" ? "✓ PASS\n" : "✗ FAIL\n");

  // ========== SCENARIO 3: 4H Setup but No 1H Entry ==========
  console.log("Scenario 3: Waiting State (4H setup active, no 1H pullback)\n");
  
  const orchestrator3 = new MTFSetupOrchestrator();
  
  const oneHNoPullback = [
    { timestamp: '2024-01-10T00:00:00Z', open: 1.0960, high: 1.0970, low: 1.0950, close: 1.0965 },
    { timestamp: '2024-01-10T01:00:00Z', open: 1.0965, high: 1.0980, low: 1.0960, close: 1.0975 },
    { timestamp: '2024-01-10T02:00:00Z', open: 1.0975, high: 1.0990, low: 1.0970, close: 1.0985 },
    { timestamp: '2024-01-10T03:00:00Z', open: 1.0985, high: 1.1000, low: 1.0980, close: 1.0995 },
    { timestamp: '2024-01-10T04:00:00Z', open: 1.0995, high: 1.1010, low: 1.0990, close: 1.1005 },
    { timestamp: '2024-01-10T05:00:00Z', open: 1.1005, high: 1.1020, low: 1.1000, close: 1.1015 },
    { timestamp: '2024-01-10T06:00:00Z', open: 1.1015, high: 1.1030, low: 1.1010, close: 1.1025 },
    { timestamp: '2024-01-10T07:00:00Z', open: 1.1025, high: 1.1040, low: 1.1020, close: 1.1035 },
    { timestamp: '2024-01-10T08:00:00Z', open: 1.1035, high: 1.1050, low: 1.1030, close: 1.1045 },
    { timestamp: '2024-01-10T09:00:00Z', open: 1.1045, high: 1.1060, low: 1.1040, close: 1.1055 }
  ];

  const result3 = orchestrator3.scanForSetup({
    daily: dailyCandles,
    fourH: fourHCandles,
    oneH: oneHNoPullback
  }, {
    dailyIndicators: { ema20: Array(50).fill(1.0850), ema50: Array(50).fill(1.0830) },
    fourHIndicators: { adx: Array(fourHCandles.length).fill(25) },
    oneHIndicators: { rsi: Array(oneHNoPullback.length).fill(50), atr: Array(oneHNoPullback.length).fill(0.0015) }
  });

  console.log(`Stage: ${result3.stage}`);
  console.log(`Daily Bias: ${result3.dailyBias.bias}`);
  console.log(`4H Setup Detected: ${result3.setup4H?.detected}`);
  console.log(`1H Entry Ready: ${result3.entry1H?.entryReady}`);
  console.log(`Active Setup: ${orchestrator3.hasActiveSetup()}`);
  console.log(`Reason: ${result3.reason}`);
  
  console.log("\n✓ Expected: Waiting state (setup active, no entry)");
  console.log(result3.setup4H?.detected && !result3.entry1H?.entryReady && orchestrator3.hasActiveSetup() ? "✓ PASS\n" : "✗ FAIL\n");

  // ========== SCENARIO 4: Daily Bias Change Invalidates Setup ==========
  console.log("Scenario 4: Setup Invalidation (daily bias changes)\n");
  
  const orchestrator4 = new MTFSetupOrchestrator();
  
  // First scan: BULLISH creates setup
  console.log("Step 1: Create setup with BULLISH bias");
  const scan1 = orchestrator4.scanForSetup({
    daily: dailyCandles,
    fourH: fourHCandles,
    oneH: oneHNoPullback
  }, {
    dailyIndicators: { ema20: Array(50).fill(1.0850), ema50: Array(50).fill(1.0830) },
    fourHIndicators: { adx: Array(fourHCandles.length).fill(25) },
    oneHIndicators: { rsi: Array(oneHNoPullback.length).fill(50), atr: Array(oneHNoPullback.length).fill(0.0015) }
  });
  
  console.log(`  4H Setup Active: ${orchestrator4.hasActiveSetup()}`);
  console.log(`  Setup Direction: ${orchestrator4.getActiveSetup()?.direction}`);
  
  // Second scan: BEARISH invalidates setup
  console.log("\nStep 2: Daily changes to BEARISH");
  const scan2 = orchestrator4.scanForSetup({
    daily: dailyCandles,
    fourH: fourHCandles,
    oneH: oneHNoPullback
  }, {
    dailyIndicators: { ema20: Array(50).fill(1.0830), ema50: Array(50).fill(1.0850) }, // Changed to BEARISH
    fourHIndicators: { adx: Array(fourHCandles.length).fill(25) },
    oneHIndicators: { rsi: Array(oneHNoPullback.length).fill(50), atr: Array(oneHNoPullback.length).fill(0.0015) }
  });
  
  console.log(`  4H Setup Active: ${orchestrator4.hasActiveSetup()}`);
  console.log(`  Daily Bias: ${scan2.dailyBias.bias}`);
  console.log(`  Reason: ${scan2.reason}`);
  
  console.log("\n✓ Expected: Setup invalidated");
  console.log(!orchestrator4.hasActiveSetup() && scan2.dailyBias.bias === "BEARISH" ? "✓ PASS\n" : "✗ FAIL\n");

  console.log("=== Phase 3.5 Complete ===");
  console.log("\nAll 4 scenarios tested:");
  console.log("1. Complete flow ✓");
  console.log("2. Bias mismatch rejection ✓");
  console.log("3. Waiting state ✓");
  console.log("4. Setup invalidation ✓");
}

testMTFSystem();
