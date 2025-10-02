// signal-generation/position-sizer.js
class PositionSizer {
  constructor(config = {}) {
    this.accountBalance = config.accountBalance || 10000; // Default $10k
    this.riskPercentage = config.riskPercentage || 1; // Risk 1% per trade
    this.maxPositionSize = config.maxPositionSize || 100000; // Max 1 lot
  }

  /**
   * Calculate position size
   */
  calculateSize(signal, accountBalance = this.accountBalance) {
    const { entry, stopLoss } = signal.tradingParams;

    console.log("\n📍 [PositionSizer] Calculating position size...");
    console.log(`   Account Balance: $${accountBalance}`);
    console.log(`   Entry: ${entry}, StopLoss: ${stopLoss}`);

    if (!entry || !stopLoss) {
      return { size: 0, lots: 0, risk: 0, reason: "Invalid trading parameters" };
    }

    const riskAmount = accountBalance * (this.riskPercentage / 100);
    const stopDistance = Math.abs(entry - stopLoss);
    const pipValue = 10; // For EUR/USD: $10 per lot
    const stopDistancePips = stopDistance * 10000;

    const positionSize = riskAmount / (stopDistancePips * pipValue);
    const lots = Math.min(positionSize, this.maxPositionSize / 100000);

    return {
      size: Number((lots * 100000).toFixed(0)),
      lots: Number(lots.toFixed(2)),
      risk: riskAmount,
      riskPercentage: this.riskPercentage,
      stopDistancePips: Number(stopDistancePips.toFixed(1)),
      potentialLoss: riskAmount,
      potentialProfit: this.calculatePotentialProfit(signal, lots)
    };
  }

  calculatePotentialProfit(signal, lots) {
    const { entry, target } = signal.tradingParams;
    const distance = Math.abs(target - entry);
    const pips = distance * 10000;
    return Number((pips * 10 * lots).toFixed(2));
  }

  adjustForVolatility(baseSize, volatilityLevel) {
    if (volatilityLevel === "HIGH") return baseSize * 0.7;
    if (volatilityLevel === "LOW") return baseSize * 1.2;
    return baseSize;
  }
}

module.exports = PositionSizer;
