// quality-control/filter-engine.js
const MTFAAlignmentFilter = require('./filters/mtfa-alignment-filter');
const RiskRewardFilter = require('./filters/risk-reward-filter');
const VolatilityFilter = require('./filters/volatility-filter');
const SpreadFilter = require('./filters/spread-filter');
const FilterConfig = require('./config/filter-config');

class FilterEngine {
  constructor(config = {}) {
    this.config = config.filters || FilterConfig.filters;

    this.filters = [
      new MTFAAlignmentFilter(this.config.mtfaAlignment),
      new RiskRewardFilter(this.config.riskReward),
      new VolatilityFilter(this.config.volatility),
      new SpreadFilter(this.config.spread)
    ];
  }

  /**
   * Run all filters on signal
   * @param {Object} signal - From Phase 3 signal composer
   * @param {Object} mtfa - Phase 1 data
   * @param {Object} ensemble - Phase 2 data
   */
  runFilters(signal, mtfa, ensemble) {
    console.log("\n🔍 Running Quality Control Filters...");

    if (signal.signal === "NO_SIGNAL") {
      return {
        passed: false,
        reason: "No signal to filter",
        results: []
      };
    }

    const results = [];

    for (const filter of this.filters) {
      const result = filter.check(signal, mtfa, ensemble);
      results.push(result);

      console.log(`   ${result.passed ? '✅' : '❌'} ${filter.name}: ${result.message}`);

      // If any filter fails and is blocking → reject immediately
      if (!result.passed && result.blocking) {
        return {
          passed: false,
          reason: `Filter failed: ${filter.name}`,
          failedFilter: filter.name,
          message: result.message,
          results
        };
      }
    }

    return {
      passed: true,
      reason: "All filters passed",
      results
    };
  }

  getFilterSummary(results) {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    return `${passed}/${total} filters passed`;
  }
}

module.exports = FilterEngine;
