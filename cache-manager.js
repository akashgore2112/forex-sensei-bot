// cache-manager.js
const fs = require("fs");
const path = require("path");

class CacheManager {
  constructor(cacheDir = "cache") {
    this.cacheDir = cacheDir;
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }
  }

  // ✅ Generate file path
  _getFilePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  // ✅ Save data to cache
  set(key, data, ttlMinutes = 1440) {
    const filePath = this._getFilePath(key);
    const payload = {
      timestamp: Date.now(),
      ttl: ttlMinutes,
      data
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  }

  // ✅ Load data if cache is valid
  get(key) {
    const filePath = this._getFilePath(key);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const cached = JSON.parse(raw);

    const ageMinutes = (Date.now() - cached.timestamp) / 60000;
    if (ageMinutes > cached.ttl) {
      return null; // expired
    }
    return cached.data;
  }

  // ✅ Clear cache
  clear(key) {
    const filePath = this._getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = CacheManager;
