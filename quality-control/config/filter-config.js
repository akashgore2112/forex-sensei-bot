// quality-control/config/filter-config.js
module.exports = {
  filters: {
    mtfaAlignment: {
      minAlignment: 1,
      blocking: false  // CHANGED: true → false
    },
    riskReward: {
      minRR: 1.5,
      blocking: false
    },
    volatility: {
      blockHighVol: false,
      blocking: false
    },
    spread: {
      maxSpreadPips: 2.0,
      blocking: false
    }
  }
};
