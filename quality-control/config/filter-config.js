// quality-control/config/filter-config.js
module.exports = {
  filters: {
    mtfaAlignment: {
      minAlignment: 1,
      blocking: true  // CHANGED: false → true (block misaligned trades)
    },
    riskReward: {
      minRR: 1.5,
      blocking: true
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
