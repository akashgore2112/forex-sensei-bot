// signal-generation/telegram-formatter.js
class TelegramFormatter {
  format(signal) {
    if (signal.direction === "NO_SIGNAL") {
      return this.formatNoSignal();
    }

    const emoji = signal.direction === "BUY" ? "📈" : "📉";
    const grade = this.getGradeEmoji(signal.quality.grade);

    return `
${emoji} **${signal.direction} SIGNAL** ${emoji}
━━━━━━━━━━━━━━━━━━━
📊 **Pair:** ${signal.pair}
⏰ **Time:** ${new Date(signal.timestamp).toLocaleString()}
🎯 **Quality:** ${signal.quality.grade} (${signal.quality.score}/100) ${grade}
💪 **Confidence:** ${(signal.confidence * 100).toFixed(0)}%
━━━━━━━━━━━━━━━━━━━
📍 **ENTRY**
💰 Price: ${signal.entry.price}
📊 Type: ${signal.entry.type}
━━━━━━━━━━━━━━━━━━━
🎯 **EXIT TARGETS**
🛑 Stop Loss: ${signal.exits.stopLoss}
🎯 Take Profit: ${signal.exits.takeProfit}
${signal.exits.trailing ? `📉 Trailing Stop: ${JSON.stringify(signal.exits.trailing)}` : ""}
${signal.exits.partial ? `📊 Partial TP: ${JSON.stringify(signal.exits.partial)}` : ""}
━━━━━━━━━━━━━━━━━━━
📦 **POSITION**
Lots: ${signal.position.size}
Risk: ${signal.position.risk} (${signal.position.potentialLoss} USD)
Profit Potential: ${signal.position.potentialProfit} USD
━━━━━━━━━━━━━━━━━━━
⚖️ **RISK METRICS**
RR: ${signal.risk.riskReward.toFixed(1)}:1
Risk: ${signal.risk.riskPips} pips | Reward: ${signal.risk.rewardPips} pips
Win Rate Needed: ${signal.risk.winRateNeeded}%
━━━━━━━━━━━━━━━━━━━
🧠 **ANALYSIS**
${signal.analysis.final}
━━━━━━━━━━━━━━━━━━━
⏰ **TIMING**
Session: ${signal.timing.session} | Liquidity: ${signal.timing.liquidity}
${signal.timing.recommendation}
━━━━━━━━━━━━━━━━━━━
Signal ID: ${signal.id}
    `;
  }

  formatNoSignal() {
    return `
⚠️ **NO SIGNAL**
━━━━━━━━━━━━━━━━━━━
No high-quality setup found.
Next analysis in 1 hour.
`;
  }

  getGradeEmoji(grade) {
    const emojis = {
      'A': '⭐⭐⭐',
      'B': '⭐⭐',
      'C': '⭐',
      'D': '⚠️',
      'F': '❌'
    };
    return emojis[grade] || '';
  }
}

module.exports = TelegramFormatter;
