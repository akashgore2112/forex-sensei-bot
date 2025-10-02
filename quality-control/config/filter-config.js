// quality-control/config/filter-config.js
module.exports = {
  filters: {
    mtfaAlignment: {
      minAlignment: 1,        // CHANGED: 2 → 1 (only 1/3 timeframes needed)
      blocking: true
    },
    riskReward: {
      minRR: 1.5,            // CHANGED: 2.0 → 1.5 (lower RR acceptable)
      blocking: true
    },
    volatility: {
      blockHighVol: false,    // CHANGED: true → false (allow high vol)
      blocking: false
    },
    spread: {
      maxSpreadPips: 2.0,
      blocking: false
    }
  }
};
