// cache-manager.js
const fs = require("fs");
const path = require("path");

class CacheManager {
  constructor(cacheDir = "cache", statsFile = "cache/cache-stats.json") {
    this.cacheDir = cacheDir;
    this.statsFile = statsFile;

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }

    // ✅ Load or initialize stats
    if (fs.existsSync(this.statsFile)) {
      this.stats = JSON.parse(fs.readFileSync(this.statsFile, "utf-8"));
    } else {
      this.stats = {
        apiCalls: 0,
        apiCallsByPair: {},
        cacheHits: 0,
        cacheMisses: 0,
        lastReset: new Date().toISOString()
      };
      this._saveStats();
    }
  }

  // ✅ Internal: Save stats
  _saveStats() {
    fs.writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2));
  }

  // ✅ Internal: Generate file path
  _getFilePath(key) {
    const safeKey = key.replace(/[\/\\]/g, "_"); // replace / and \ with _
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  // ✅ Track API usage
  trackAPICall(pair) {
    this.stats.apiCalls += 1;
    if (!this.stats.apiCallsByPair[pair]) {
      this.stats.apiCallsByPair[pair] = 0;
    }
    this.stats.apiCallsByPair[pair] += 1;
    this._saveStats();
  }

  // ✅ Save cache
  save(key, data) {
    const filePath = this._getFilePath(key);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ timestamp: Date.now(), data }, null, 2)
    );

    this.stats.cacheMisses += 1; // saving new data → cache miss
    this._saveStats();
  }

  // ✅ Load cache with TTL
  load(key, maxAgeMinutes = 1440) {
    const filePath = this._getFilePath(key);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const cached = JSON.parse(raw);

    const ageMinutes = (Date.now() - cached.timestamp) / 60000;
    if (ageMinutes > maxAgeMinutes) {
      return null;
    }

    this.stats.cacheHits += 1; // loaded successfully → cache hit
    this._saveStats();
    return cached.data;
  }

  // ✅ Clear cache
  clear(key) {
    const filePath = this._getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // ✅ Aliases
  set(key, data, maxAgeMinutes = 1440) {
    this.save(key, data, maxAgeMinutes);
  }

  get(key, maxAgeMinutes = 1440) {
    return this.load(key, maxAgeMinutes);
  }

  // ✅ Get current stats
  getStats() {
    return {
      ...this.stats,
      remainingCalls: 500 - this.stats.apiCalls // AlphaVantage free limit
    };
  }
}

module.exports = CacheManager;
