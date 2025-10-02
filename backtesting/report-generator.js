// backtesting/report-generator.js
class ReportGenerator {
  generate(metrics, trades, tradeInsights) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   BACKTEST RESULTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 OVERVIEW");
    console.log(`Total Trades: ${metrics.totalTrades}`);
    console.log(`Win Rate: ${metrics.winRate}%`);
    console.log(`Wins: ${metrics.wins} | Losses: ${metrics.losses}\n`);

    console.log("💰 PROFITABILITY");
    console.log(`Starting Balance: $${metrics.startBalance}`);
    console.log(`Final Balance: $${metrics.finalBalance}`);
    console.log(`Net Profit: $${metrics.netProfit}`);
    console.log(`ROI: ${metrics.roi}%\n`);

    console.log("📈 PERFORMANCE METRICS");
    console.log(`Average Win: $${metrics.avgWin}`);
    console.log(`Average Loss: $${metrics.avgLoss}`);
    console.log(`Profit Factor: ${metrics.profitFactor}`);
    console.log(`Avg Risk:Reward: ${metrics.avgRiskReward}:1\n`);

    console.log("⚠️  RISK METRICS");
    console.log(`Max Drawdown: ${metrics.maxDrawdown}%`);
    console.log(`Sharpe Ratio: ${metrics.sharpeRatio}\n`);

    console.log("🏆 GRADE");
    const grade = this.assignGrade(metrics);
    console.log(`System Performance: ${grade}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return {
      metrics,
      grade,
      tradeInsights,
      recommendation: this.getRecommendation(metrics),
      trades: trades.slice(-10) // Last 10 trades for quick view
    };
  }

  assignGrade(metrics) {
    const { winRate, roi, profitFactor, maxDrawdown } = metrics;

    if (winRate >= 65 && roi >= 50 && profitFactor >= 2 && maxDrawdown < 15) {
      return "A - Excellent";
    } else if (winRate >= 55 && roi >= 30 && profitFactor >= 1.5 && maxDrawdown < 25) {
      return "B - Good";
    } else if (winRate >= 50 && roi >= 10 && profitFactor >= 1.2) {
      return "C - Acceptable";
    } else if (winRate >= 45 && roi > 0) {
      return "D - Needs Improvement";
    } else {
      return "F - Not Production Ready";
    }
  }

  getRecommendation(metrics) {
    if (metrics.winRate < 50) {
      return "System needs optimization - win rate too low";
    }
    if (metrics.profitFactor < 1.5) {
      return "Profit factor needs improvement - adjust risk/reward";
    }
    if (metrics.maxDrawdown > 30) {
      return "Drawdown too high - reduce position sizing";
    }
    if (metrics.winRate >= 55 && metrics.roi >= 20) {
      return "System ready for paper trading";
    }
    return "Continue optimization before live deployment";
  }
}

module.exports = ReportGenerator;
