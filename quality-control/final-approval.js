// quality-control/final-approval.js
class FinalApproval {
  constructor(config = {}) {
    this.minQualityScore = config.minQualityScore || 30; // Minimum passing score
  }

  /**
   * Final approval decision
   * @param {Object} signal - Final signal
   * @param {Object} filterResults - From Step 13
   * @param {Object} validationResult - From Step 14
   * @param {Object} qualityScore - From Step 15.1
   */
  approve(signal, filterResults, validationResult, qualityScore) {
    console.log("\n🎯 Final Approval Decision...");

    // ❌ Automatic rejections
    if (signal.signal === "NO_SIGNAL") {
      return this.reject("No signal generated");
    }
    if (!filterResults.passed) {
      return this.reject(`Filter failed: ${filterResults.failedFilter}`);
    }
    if (!validationResult.valid) {
      return this.reject(`Validation errors: ${validationResult.errors.join(', ')}`);
    }
    if (qualityScore.score < this.minQualityScore) {
      return this.reject(
        `Quality score ${qualityScore.score} below minimum ${this.minQualityScore}`
      );
    }

    // ✅ All checks passed
    return this.approve_signal(qualityScore);
  }

  approve_signal(qualityScore) {
    console.log(`   ✅ APPROVED - Grade ${qualityScore.grade}`);
    return {
      approved: true,
      reason: `Signal approved with quality grade ${qualityScore.grade}`,
      qualityScore: qualityScore.score,
      grade: qualityScore.grade
    };
  }

  reject(reason) {
    console.log(`   ❌ REJECTED - ${reason}`);
    return {
      approved: false,
      reason,
      qualityScore: 0,
      grade: "F"
    };
  }
}

module.exports = FinalApproval;
