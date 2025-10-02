// quality-control/filters/spread-filter.js
class SpreadFilter {
  constructor(config = {}) {
    this.name = "Spread Check";
    this.maxSpreadPips = config.maxSpreadPips || 2.0;
    this.blocking = config.blocking || false; // warning only
  }

  check() {
    // Placeholder - normally from broker API
    const currentSpread = 1.2;
    const passed = currentSpread <= this.maxSpreadPips;

    return {
      passed,
      blocking: this.blocking,
      message: passed
        ? `Spread ${currentSpread} pips acceptable`
        : `Spread ${currentSpread} pips too high`,
      details: { currentSpread, maxSpread: this.maxSpreadPips }
    };
  }
}

module.exports = SpreadFilter;
