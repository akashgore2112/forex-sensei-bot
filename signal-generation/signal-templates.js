// signal-generation/signal-templates.js
module.exports = {
  buySignal: (data) => `📈 BUY ${data.pair} @ ${data.entry.price}`,
  sellSignal: (data) => `📉 SELL ${data.pair} @ ${data.entry.price}`,
  noSignal: () => `⚠️ NO SIGNAL - Waiting for next opportunity`,

  entrySection: (entry) => `
📍 ENTRY
💰 Price: ${entry.price}
📊 Type: ${entry.type}
`,

  riskSection: (risk) => `
⚠️ RISK MANAGEMENT
RR: ${risk.riskReward}:1
Max Loss: $${risk.maxLoss}
Max Profit: $${risk.maxProfit}
`
};
