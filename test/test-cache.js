const CacheManager = require("../cache-manager");

// ✅ Create cache manager
const cache = new CacheManager();

// ----------------------
// Step 1: Basic Save/Load
// ----------------------
cache.save("EURUSD_DAILY", { test: "Hello Cache", value: 123 });
console.log("✅ Data Saved to Cache!");

const loaded = cache.load("EURUSD_DAILY", 60); // 60 minutes valid
console.log("📂 Loaded from Cache:", loaded);

setTimeout(() => {
  const expired = cache.load("EURUSD_DAILY", 0.001); // expire instantly
  console.log("⚠️ Expired Cache Result:", expired);
}, 2000);

// ----------------------
// Step 2: Cache Hit/Miss Test
// ----------------------
function testHitMiss() {
  const key = "HIT_TEST";
  cache.save(key, { msg: "I should hit" });

  const hit = cache.load(key, 10);
  console.log("🎯 Cache Hit Test:", hit ? "HIT ✅" : "MISS ❌");

  const miss = cache.load("UNKNOWN_KEY", 10);
  console.log("🎯 Cache Miss Test:", miss ? "HIT ❌" : "MISS ✅");
}

setTimeout(testHitMiss, 3000);

// ----------------------
// Step 3: API Usage Simulation
// ----------------------
function simulateAPIUsage() {
  const apiKey = "api_usage_20240927";

  // Save initial stats
  cache.save(apiKey, {
    totalCalls: 0,
    callsByPair: {},
    lastUpdate: Date.now(),
  });

  // Simulate 3 calls (EURUSD, GBPUSD, EURUSD again)
  let usage = cache.load(apiKey);

  usage.totalCalls += 1;
  usage.callsByPair["EURUSD"] = (usage.callsByPair["EURUSD"] || 0) + 1;
  cache.save(apiKey, usage);

  usage = cache.load(apiKey);
  usage.totalCalls += 1;
  usage.callsByPair["GBPUSD"] = (usage.callsByPair["GBPUSD"] || 0) + 1;
  cache.save(apiKey, usage);

  usage = cache.load(apiKey);
  usage.totalCalls += 1;
  usage.callsByPair["EURUSD"] = (usage.callsByPair["EURUSD"] || 0) + 1;
  cache.save(apiKey, usage);

  // Final check
  const finalUsage = cache.load(apiKey);
  console.log("\n📊 API Usage Simulation:");
  console.log(finalUsage);
}

setTimeout(simulateAPIUsage, 5000);
