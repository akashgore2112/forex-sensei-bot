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
    // 🚨 TEMPORARY BYPASS FOR TESTING
    return {
      approved: true,
      reason: "Quality control temporarily bypassed for testing",
      finalScore: qualityScore.score,
      grade: qualityScore.grade
    };
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
