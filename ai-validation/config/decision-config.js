// ai-validation/config/decision-config.js
module.exports = {
  weights: {
    technical: 0.30, // Phase 1 MTFA
    ml: 0.40,        // Phase 2 Ensemble
    ai: 0.30         // Phase 3 AI Validation
  },

  thresholds: {
    minimumConfidence: 0.65, // below 65% = NO_SIGNAL
    approveThreshold: 0.75,
    cautionThreshold: 0.60,
    rejectThreshold: 0.50
  },

  filters: {
    requireAIApproval: false,
    blockOnAIReject: true,
    minModelAgreement: 0.5,
    allowHoldSignals: false
  }
};
