// backtesting/trade-analyzer.js
class TradeAnalyzer {
  analyze(trades) {
    console.log("\n🔎 Analyzing trades...");

    const byOutcome = trades.reduce((acc, trade) => {
      acc[trade.outcome] = (acc[trade.outcome] || 0) + 1;
      return acc;
    }, {});

    const bestTrade = trades.reduce((best, t) => t.profitLoss > (best?.profitLoss || -Infinity) ? t : best, null);
    const worstTrade = trades.reduce((worst, t) => t.profitLoss < (worst?.profitLoss || Infinity) ? t : worst, null);

    const byQuality = trades.reduce((acc, t) => {
      acc[t.quality] = (acc[t.quality] || 0) + 1;
      return acc;
    }, {});

    return {
      total: trades.length,
      byOutcome,
      byQuality,
      bestTrade,
      worstTrade
    };
  }
}

module.exports = TradeAnalyzer;
