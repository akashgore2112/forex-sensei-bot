// ai-validation/config/decision-config.js
module.exports = {
  weights: {
    technical: 0.30,
    ml: 0.40,
    ai: 0.30
  },

  thresholds: {
    minimumConfidence: 0.60,  // CHANGED: 0.50 → 0.60 (higher threshold)
    approveThreshold: 0.75,   // CHANGED: 0.70 → 0.75
    cautionThreshold: 0.60,   // CHANGED: 0.55 → 0.60
    rejectThreshold: 0.45     // CHANGED: 0.40 → 0.45
  },

  filters: {
    requireAIApproval: false,
    blockOnAIReject: true,
    minModelAgreement: 0.50,  // CHANGED: 0.25 → 0.50 (2/4 models must agree)
    allowHoldSignals: false
  }
};
