// signal-generation/risk-calculator.js
class RiskCalculator {
  /**
   * Calculate risk metrics
   */
  calculateRiskMetrics(signal, positionSize) {
    const { entry, stopLoss, target, riskReward } = signal.tradingParams;

    console.log("\n📍 [RiskCalculator] Calculating risk metrics...");
    const riskPips = Math.abs(entry - stopLoss) * 10000;
    const rewardPips = Math.abs(target - entry) * 10000;

    return {
      riskReward: riskReward,
      riskPips: Number(riskPips.toFixed(1)),
      rewardPips: Number(rewardPips.toFixed(1)),
      maxLoss: positionSize.potentialLoss,
      maxProfit: positionSize.potentialProfit,
      winRateNeeded: this.calculateBreakEvenWinRate(riskReward),
      riskGrade: this.assessRisk(riskReward, riskPips)
    };
  }

  calculateBreakEvenWinRate(rr) {
    const winRate = (1 / (1 + rr)) * 100;
    return Number(winRate.toFixed(1));
  }

  assessRisk(rr, riskPips) {
    if (rr >= 3 && riskPips < 30) return "LOW";
    if (rr >= 2 && riskPips < 50) return "MEDIUM";
    return "HIGH";
  }
}

module.exports = RiskCalculator;
