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

  _getFilePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  // ✅ Save data
  save(key, data) {
    const filePath = this._getFilePath(key);
    fs.writeFileSync(filePath, JSON.stringify({
      timestamp: Date.now(),
      data
    }, null, 2));
  }

  // ✅ Load data
  load(key, maxAgeMinutes = 1440) {
    const filePath = this._getFilePath(key);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const cached = JSON.parse(raw);

    const ageMinutes = (Date.now() - cached.timestamp) / 60000;
    if (ageMinutes > maxAgeMinutes) {
      return null;
    }
    return cached.data;
  }

  // ✅ Clear
  clear(key) {
    const filePath = this._getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // ✅ Aliases (for consistency with SwingDataFetcher)
  set(key, data, maxAgeMinutes = 1440) {
    this.save(key, data);
  }

  get(key, maxAgeMinutes = 1440) {
    return this.load(key, maxAgeMinutes);
  }
}

module.exports = CacheManager;
