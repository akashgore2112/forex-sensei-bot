// backtesting/performance-calculator.js
class PerformanceCalculator {
  calculate(trades, startBalance) {
    console.log("\n📊 Calculating performance metrics...");

    const wins = trades.filter(t => t.outcome === "WIN");
    const losses = trades.filter(t => t.outcome === "LOSS" || t.outcome === "TIMEOUT");

    const totalTrades = trades.length;
    const winCount = wins.length;
    const lossCount = losses.length;

    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

    const totalProfit = wins.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.profitLoss, 0));
    const netProfit = totalProfit - totalLoss;

    const finalBalance = trades.length > 0
      ? trades[trades.length - 1].balanceAfter
      : startBalance;

    const roi = ((finalBalance - startBalance) / startBalance) * 100;

    const avgWin = winCount > 0 ? totalProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0;

    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
    const avgRR = trades.reduce((sum, t) => sum + t.riskReward, 0) / totalTrades;

    const maxDrawdown = this.calculateMaxDrawdown(trades, startBalance);
    const sharpeRatio = this.calculateSharpe(trades);

    return {
      totalTrades,
      wins: winCount,
      losses: lossCount,
      winRate: Number(winRate.toFixed(2)),

      totalProfit: Number(totalProfit.toFixed(2)),
      totalLoss: Number(totalLoss.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),

      startBalance,
      finalBalance: Number(finalBalance.toFixed(2)),
      roi: Number(roi.toFixed(2)),

      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      avgRiskReward: Number(avgRR.toFixed(2)),

      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2))
    };
  }

  calculateMaxDrawdown(trades, startBalance) {
    let peak = startBalance;
    let maxDrawdown = 0;

    for (const trade of trades) {
      const balance = trade.balanceAfter;

      if (balance > peak) {
        peak = balance;
      }

      const drawdown = ((peak - balance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  calculateSharpe(trades) {
    if (trades.length < 2) return 0;

    const returns = trades.map(t => (t.profitLoss / 10000) * 100); // % returns
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }
}

module.exports = PerformanceCalculator;
