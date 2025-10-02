// quality-control/signal-validator.js
const ValidationRules = require('./validation-rules');

class SignalValidator {
  constructor() {
    this.rules = ValidationRules;
  }

  /**
   * Validate final signal
   * @param {Object} signal - From Phase 3 signal composer
   * @returns {Object} validation result
   */
  validate(signal) {
    console.log("\n✅ Validating signal structure...");

    const errors = [];
    const warnings = [];

    // 1. Required fields check
    for (const field of this.rules.requiredFields) {
      if (!this.hasField(signal, field)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // 2. Trading params validation
    if (signal.signal !== "NO_SIGNAL") {
      const params = signal.tradingParams;

      if (!params.entry || !params.stopLoss || !params.target) {
        errors.push("Trading parameters incomplete");
      }
      if (params.entry === params.stopLoss) {
        errors.push("Entry equals stop loss");
      }
      if (signal.signal === "BUY" && params.target <= params.entry) {
        errors.push("BUY signal but target below entry");
      }
      if (signal.signal === "SELL" && params.target >= params.entry) {
        errors.push("SELL signal but target above entry");
      }
    }

    // 3. Confidence validation
    if (signal.confidence < 0 || signal.confidence > 1) {
      errors.push(`Invalid confidence: ${signal.confidence}`);
    }
    if (signal.confidence < this.rules.confidenceThresholds.minimum) {
      warnings.push(`Low confidence: ${(signal.confidence * 100).toFixed(1)}%`);
    }

    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  hasField(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (!current || !(part in current)) return false;
      current = current[part];
    }

    return current !== null && current !== undefined;
  }
}

module.exports = SignalValidator;
