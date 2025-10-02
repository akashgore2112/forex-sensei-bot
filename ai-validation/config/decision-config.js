// ai-validation/config/decision-config.js
module.exports = {
  weights: {
    technical: 0.30,
    ml: 0.40,
    ai: 0.30
  },

  thresholds: {
    minimumConfidence: 0.50,  // CHANGED: 65% → 50%
    approveThreshold: 0.70,   // CHANGED: 75% → 70%
    cautionThreshold: 0.55,   // CHANGED: 60% → 55%
    rejectThreshold: 0.40     // kept same
  },

  filters: {
    requireAIApproval: false,
    blockOnAIReject: true,
    minModelAgreement: 0.25,  // CHANGED: 50% → 25% (1/4 models enough)
    allowHoldSignals: false
  }
};
