const fs = require("fs");
const path = require("path");

class CacheManager {
  constructor(cacheDir = "cache") {
    this.cacheDir = cacheDir;
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }
  }

  // Make a cache file path
  _getCachePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  // Save cache data
  saveCache(key, data, ttlMinutes = 60) {
    const cacheFile = this._getCachePath(key);
    const record = {
      data,
      expiry: Date.now() + ttlMinutes * 60 * 1000, // expiry in ms
    };
    fs.writeFileSync(cacheFile, JSON.stringify(record, null, 2));
  }

  // Load cache data
  loadCache(key) {
    const cacheFile = this._getCachePath(key);
    if (!fs.existsSync(cacheFile)) return null;

    try {
      const record = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      if (record.expiry > Date.now()) {
        return record.data; // valid cache
      } else {
        fs.unlinkSync(cacheFile); // expired cache delete
        return null;
      }
    } catch (err) {
      console.error("Cache read error:", err);
      return null;
    }
  }
}

module.exports = CacheManager;
