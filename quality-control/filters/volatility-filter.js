// quality-control/filters/volatility-filter.js
class VolatilityFilter {
  constructor(config = {}) {
    this.name = "Volatility Check";
    this.blockHighVol = config.blockHighVol !== false;
    this.blocking = config.blocking !== false;
  }

  check(signal, mtfa, ensemble) {
    const volLevel = ensemble.models.volatility.volatilityLevel;

    if (this.blockHighVol && volLevel === "HIGH") {
      return {
        passed: false,
        blocking: this.blocking,
        message: "Volatility too high - risky conditions",
        details: { volLevel }
      };
    }

    return {
      passed: true,
      blocking: false,
      message: `Volatility ${volLevel} acceptable`,
      details: { volLevel }
    };
  }
}

module.exports = VolatilityFilter;
