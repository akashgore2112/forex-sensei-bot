// quality-control/filters/risk-reward-filter.js
class RiskRewardFilter {
  constructor(config = {}) {
    this.name = "Risk-Reward Ratio";
    this.minRR = config.minRR || 2.0;
    this.blocking = config.blocking !== false;
  }

  check(signal) {
    const rr = signal.tradingParams.riskReward;

    if (!rr) {
      return {
        passed: false,
        blocking: this.blocking,
        message: "Risk-reward not calculated"
      };
    }

    const passed = rr >= this.minRR;

    return {
      passed,
      blocking: this.blocking,
      message: passed
        ? `RR ${rr.toFixed(2)}:1 meets min ${this.minRR}:1`
        : `RR ${rr.toFixed(2)}:1 below min ${this.minRR}:1`,
      details: { rr, minRR: this.minRR }
    };
  }
}

module.exports = RiskRewardFilter;
