// quality-control/filters/mtfa-alignment-filter.js
class MTFAAlignmentFilter {
  constructor(config = {}) {
    this.name = "MTFA Alignment";
    this.minAlignment = config.minAlignment || 2; // at least 2/3 must align
    this.blocking = config.blocking !== false;
  }

  check(signal, mtfa) {
    const direction = signal.signal; // BUY / SELL
    const biases = mtfa.biases;
    let aligned = 0;

    const expected = direction === "BUY" ? "BULLISH" : "BEARISH";

    if (biases.daily === expected) aligned++;
    if (biases.weekly === expected) aligned++;
    if (biases.monthly === expected) aligned++;

    const passed = aligned >= this.minAlignment;

    return {
      passed,
      blocking: this.blocking,
      message: passed
        ? `${aligned}/3 timeframes aligned with ${direction}`
        : `Only ${aligned}/3 aligned (need ${this.minAlignment})`,
      details: { aligned, required: this.minAlignment, biases }
    };
  }
}

module.exports = MTFAAlignmentFilter;
