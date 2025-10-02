// quality-control/config/filter-config.js
module.exports = {
  filters: {
    mtfaAlignment: {
      minAlignment: 2,
      blocking: true
    },
    riskReward: {
      minRR: 2.0,
      blocking: true
    },
    volatility: {
      blockHighVol: true,
      blocking: true
    },
    spread: {
      maxSpreadPips: 2.0,
      blocking: false // warning only
    }
  }
};
