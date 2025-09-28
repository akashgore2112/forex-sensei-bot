// verifySTP1.js
// ✅ Consolidated Phase 1 Verification with TA-Lib

const SwingDataFetcher = require("../swingDataFetcher");
const SwingIndicators = require("../swing-indicators");
const MTFA = require("../mtfa");
const CacheManager = require("../cache-manager");
const fs = require("fs");

async function verifyPhase1() {
  console.log("🧪 Starting Phase 1 Full Verification...\n");

  // === 1. Data Fetching Tests ===
  console.log("📊 Testing Data Fetching...");
  const daily = await SwingDataFetcher.getDailyData("EUR/USD");
  const weekly = await SwingDataFetcher.getWeeklyData("EUR/USD");
  const monthly = await SwingDataFetcher.getMonthlyData("EUR/USD");

  console.log(`✅ Daily candles: ${daily.length}`);
  console.log(`✅ Weekly candles: ${weekly.length}`);
  console.log(`✅ Monthly candles: ${monthly.length}`);

  if (daily.length < 500) console.warn("⚠️ Daily candles < 500 (expected 500+)");
  if (weekly.length < 100) console.warn("⚠️ Weekly candles < 100 (expected 100+)");
  if (monthly.length < 24) console.warn("⚠️ Monthly candles < 24 (expected 24+)");

  // === 2. Indicator Tests (now async with TA-Lib) ===
  console.log("\n📈 Testing Technical Indicators (via TA-Lib)...");
  const indicators = await SwingIndicators.calculateAll(daily);

  console.log("EMA20:", indicators.ema20);
  console.log("EMA50:", indicators.ema50);
  console.log("EMA200:", indicators.ema200);
  console.log("RSI(14):", indicators.rsi14);
  console.log("MACD:", indicators.macd);
  console.log("ADX:", indicators.adx);
  console.log("ATR:", indicators.atr);
  console.log("Bollinger Bands:", indicators.bollinger);

  console.log("\n🔍 Support/Resistance Levels:");
  console.log("Support:", indicators.supportResistance.support);
  console.log("Resistance:", indicators.supportResistance.resistance);

  // === 3. Multi-Timeframe Analysis ===
  console.log("\n🔍 Testing Multi-Timeframe Analysis (MTFA)...");
  const mtfa = await MTFA.analyze("EUR/USD");
  console.dir(mtfa, { depth: null });

  // === 4. Cache & API Tracking ===
  console.log("\n💾 Testing Cache & API Tracking...");
  const cache = new CacheManager();
  cache.save("EURUSD_DAILY", daily);

  const cached = cache.load("EURUSD_DAILY");
  console.log("Cache Load Success:", !!cached);

  const statsFile = "cache/cache-stats.json";
  if (fs.existsSync(statsFile)) {
    const stats = JSON.parse(fs.readFileSync(statsFile, "utf-8"));
    console.log("📊 Cache/API Stats:", stats);
  } else {
    console.warn("⚠️ cache/cache-stats.json missing, tracking may not be enabled");
  }

  // === 5. Final Result ===
  console.log("\n🎯 Phase 1 Verification Completed with TA-Lib!");
  console.log("👉 Review logs above to confirm all components are working.\n");
}

// Run
verifyPhase1();
