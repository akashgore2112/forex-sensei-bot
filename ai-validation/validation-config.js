// ============================================================================
// ⚙️ Phase 3 - Step 10.4: Validation Config
// Centralized configuration for AI Validator
// ============================================================================

require("dotenv").config();

module.exports = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4",
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
    timeout: 30000 // ms
  },

  validation: {
    minimumAIConfidence: 0.60,  // Signals below this AI confidence will be CAUTION
    approveThreshold: 0.75,     // >= 75% quality → APPROVE
    rejectThreshold: 0.40       // <= 40% quality → REJECT
  },

  fallback: {
    enabled: true,              // Enable fallback when API fails
    useEnsembleOnly: true       // Rely only on ensemble if AI unavailable
  }
};
