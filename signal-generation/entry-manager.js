// signal-generation/entry-manager.js
class EntryManager {
  constructor(config = {}) {
    this.useMarketEntry = config.useMarketEntry !== false;
    this.useLimitEntry = config.useLimitEntry || false;
    this.entryBuffer = config.entryBuffer || 0.0002; // 2 pips
  }

  /**
   * Calculate entry strategy
   * @param {Object} signal - From Phase 4
   * @param {Object} mtfa - From Phase 1
   */
  calculateEntry(signal, mtfa) {
    const currentPrice = mtfa.dailyCandles[mtfa.dailyCandles.length - 1].close;
    const direction = signal.signal;

    console.log("\n📍 [EntryManager] Calculating entry...");
    console.log(`   Direction: ${direction}`);
    console.log(`   Current Price: ${currentPrice}`);

    if (direction === "NO_SIGNAL") {
      return { type: "NO_ENTRY", price: null, conditions: [] };
    }

    // Market Entry
    if (this.useMarketEntry) {
      console.log("   ✅ Using MARKET entry");
      return {
        type: "MARKET",
        price: currentPrice,
        conditions: ["Execute immediately at market price"],
        buffer: 0
      };
    }

    // Limit Entry
    if (this.useLimitEntry) {
      return this.calculateLimitEntry(signal, currentPrice, direction);
    }

    return { type: "MARKET", price: currentPrice, conditions: [] };
  }

  calculateLimitEntry(signal, currentPrice, direction) {
    const buffer = this.entryBuffer;
    let limitPrice;

    if (direction === "BUY") {
      limitPrice = currentPrice * (1 - buffer);
      console.log(`   ⏳ Using LIMIT entry for BUY at ${limitPrice.toFixed(5)}`);
    } else {
      limitPrice = currentPrice * (1 + buffer);
      console.log(`   ⏳ Using LIMIT entry for SELL at ${limitPrice.toFixed(5)}`);
    }

    return {
      type: "LIMIT",
      price: Number(limitPrice.toFixed(5)),
      conditions: [
        `Wait for price to reach ${limitPrice.toFixed(5)}`,
        "Or enter at market if urgency is high"
      ],
      buffer
    };
  }

  /**
   * Validate entry
   */
  validateEntry(signal, currentPrice) {
    const entry = signal.tradingParams.entry;
    const direction = signal.signal;
    if (direction === "BUY") return currentPrice <= entry * 1.001;
    if (direction === "SELL") return currentPrice >= entry * 0.999;
    return false;
  }
}

module.exports = EntryManager;
