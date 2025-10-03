// ai-validation/config/decision-config.js
module.exports = {
  weights: {
    technical: 0.30,
    ml: 0.40,
    ai: 0.30
  },

  thresholds: {
    minimumConfidence: 0.50,  // CHANGED: 0.60 → 0.50
    approveThreshold: 0.70,
    cautionThreshold: 0.55,
    rejectThreshold: 0.45
  },

  filters: {
    requireAIApproval: false,
    blockOnAIReject: true,
    minModelAgreement: 0.25,  // CHANGED: 0.50 → 0.25
    allowHoldSignals: false
  }
};
