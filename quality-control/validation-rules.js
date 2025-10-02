// quality-control/validation-rules.js
module.exports = {
  requiredFields: [
    'pair',
    'timestamp',
    'signal',
    'confidence',
    'analysis',
    'tradingParams',
    'reasoning',
    'metadata'
  ],

  confidenceThresholds: {
    minimum: 0.65,   // below this → weak
    good: 0.75,      // above this → good
    excellent: 0.85  // above this → excellent
  },

  riskRewardThresholds: {
    minimum: 1.5,   // below this → reject
    good: 2.0,      // acceptable
    excellent: 3.0  // strong
  }
};
