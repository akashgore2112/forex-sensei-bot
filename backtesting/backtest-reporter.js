// backtesting/backtest-reporter.js
class BacktestReporter {
  generateReport(trades, initialBalance) {
    const wins = trades.filter(t => t.outcome === "WIN");
    const losses = trades.filter(t => t.outcome === "LOSS");
    const timeouts = trades.filter(t => t.outcome === "TIMEOUT");

    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const finalBalance = trades.length > 0 ? trades[trades.length - 1].balanceAfter : initialBalance;
    const roi = ((finalBalance - initialBalance) / initialBalance) * 100;

    const totalPips = trades.reduce((sum, t) => sum + (t.pips || 0), 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.profitLoss, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.profitLoss, 0) / losses.length : 0;

    console.log("\n========== BACKTEST RESULTS ==========");
    console.log(`Total Trades: ${trades.length}`);
    console.log(`Wins: ${wins.length} | Losses: ${losses.length} | Timeouts: ${timeouts.length}`);
    console.log(`Win Rate: ${winRate.toFixed(2)}%`);
    console.log(`Starting Balance: $${initialBalance}`);
    console.log(`Final Balance: $${finalBalance.toFixed(2)}`);
    console.log(`ROI: ${roi.toFixed(2)}%`);
    console.log(`Total Pips: ${totalPips.toFixed(1)}`);
    console.log(`Avg Win: $${avgWin.toFixed(2)} | Avg Loss: $${avgLoss.toFixed(2)}`);

    // Per-setup breakdown
    const setupTypes = [...new Set(trades.map(t => t.setupType))];
    console.log("\n--- Per-Setup Performance ---");
    setupTypes.forEach(type => {
      const setupTrades = trades.filter(t => t.setupType === type);
      const setupWins = setupTrades.filter(t => t.outcome === "WIN");
      const setupWinRate = (setupWins.length / setupTrades.length) * 100;
      console.log(`${type}: ${setupTrades.length} trades, ${setupWinRate.toFixed(1)}% win rate`);
    });

    console.log("======================================\n");

    return {
      totalTrades: trades.length,
      winRate,
      roi,
      finalBalance,
      trades: trades.map(t => ({
        timestamp: t.entryTime,
        direction: t.direction,
        entry: t.entryPrice,
        exit: t.exitPrice,
        outcome: t.outcome,
        pips: t.pips,
        profitLoss: t.profitLoss
      }))
    };
  }

  exportJSON(report, filename = "backtest-results.json") {
    const fs = require("fs");
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`Results exported to ${filename}`);
  }
}

module.exports = BacktestReporter;
