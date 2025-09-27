const CacheManager = require("./cache-manager");

// ✅ Create cache manager
const cache = new CacheManager();

// Step 1: Save sample data
cache.save("EURUSD_DAILY", { test: "Hello Cache", value: 123 });
console.log("✅ Data Saved to Cache!");

// Step 2: Load data
const loaded = cache.load("EURUSD_DAILY", 60); // 60 minutes valid
console.log("📂 Loaded from Cache:", loaded);

// Step 3: Expired check simulation
setTimeout(() => {
  const expired = cache.load("EURUSD_DAILY", 0.001); // expire instantly
  console.log("⚠️ Expired Cache Result:", expired);
}, 2000);
