// quality-control/quality-scorer.js
class QualityScorer {
  calculateScore(signal, filterResults, validationResult) {
    console.log("\n⭐ Calculating quality score...");

    let score = 0;

    // 1. Confidence Score (40 points)
    score += signal.confidence * 40;

    // 2. Filter Pass Rate (30 points)
    const filtersPassed = filterResults.results?.filter(r => r.passed).length || 0;
    const totalFilters = filterResults.results?.length || 0;
    
    // Fix: Avoid division by zero
    if (totalFilters > 0) {
      score += (filtersPassed / totalFilters) * 30;
    } else {
      // No filters ran (e.g., NO_SIGNAL) - give 0 points
      score += 0;
    }

    // 3. MTFA Alignment (15 points)
    const mtfaScore = this.getMTFAScore(signal);
    score += mtfaScore * 15;

    // 4. Risk-Reward (15 points)
    const rrScore = this.getRRScore(signal);
    score += rrScore * 15;

    // Penalties
    if (validationResult.warnings.length > 0) {
      score -= validationResult.warnings.length * 2;
    }

    // Clamp 0-100
    score = Math.max(0, Math.min(100, score));

    console.log(`   Quality Score: ${score.toFixed(1)}/100`);

    return {
      score: Number(score.toFixed(1)),
      grade: this.getGrade(score),
      breakdown: {
        confidence: signal.confidence * 40,
        filters: totalFilters > 0 ? (filtersPassed / totalFilters) * 30 : 0,
        mtfa: mtfaScore * 15,
        riskReward: rrScore * 15
      }
    };
  }

  getMTFAScore(signal) {
    const alignment = signal.metadata?.mtfaBias;
    if (!alignment) return 0.5;
    return 1.0;
  }

  getRRScore(signal) {
    const rr = signal.tradingParams?.riskReward;
    if (!rr || rr === null) return 0;
    if (rr >= 3) return 1.0;
    if (rr >= 2) return 0.8;
    if (rr >= 1.5) return 0.6;
    return 0.3;
  }

  getGrade(score) {
    if (score >= 85) return "A";
    if (score >= 75) return "B";
    if (score >= 65) return "C";
    if (score >= 50) return "D";
    return "F";
  }
}

module.exports = QualityScorer;
