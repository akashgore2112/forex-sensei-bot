// signal-generation/timing-optimizer.js
class TimingOptimizer {
  constructor() {
    this.avoidedSessions = ['ASIAN_LOW_LIQUIDITY'];
    this.preferredSessions = ['LONDON_OPEN', 'NY_OPEN', 'OVERLAP'];
  }

  /**
   * Analyze timing
   */
  analyzeTiming() {
    const now = new Date();
    const hour = now.getUTCHours();

    console.log("\n📍 [TimingOptimizer] Analyzing timing...");
    console.log(`   Current UTC Hour: ${hour}`);

    return {
      session: this.identifySession(hour),
      liquidity: this.assessLiquidity(hour),
      recommendation: this.getTimingRecommendation(hour),
      urgency: this.calculateUrgency(hour)
    };
  }

  identifySession(hour) {
    if (hour >= 0 && hour < 7) return "ASIAN";
    if (hour >= 7 && hour < 15) return "LONDON";
    if (hour >= 13 && hour < 21) return "NEW_YORK";
    return "OFF_HOURS";
  }

  assessLiquidity(hour) {
    if (hour >= 13 && hour < 15) return "HIGH";  // London/NY overlap
    if ((hour >= 7 && hour < 15) || (hour >= 13 && hour < 21)) return "MEDIUM";
    return "LOW"; // Asian or off-hours
  }

  getTimingRecommendation(hour) {
    const liquidity = this.assessLiquidity(hour);
    if (liquidity === "HIGH") return "OPTIMAL - High liquidity, execute now";
    if (liquidity === "MEDIUM") return "GOOD - Acceptable liquidity";
    return "CAUTION - Low liquidity, wait if possible";
  }

  calculateUrgency(hour) {
    const liquidity = this.assessLiquidity(hour);
    if (liquidity === "HIGH") return "HIGH";
    if (liquidity === "MEDIUM") return "MEDIUM";
    return "LOW";
  }
}

module.exports = TimingOptimizer;
