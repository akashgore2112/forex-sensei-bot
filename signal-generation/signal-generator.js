// signal-generation/signal-generator.js
const EntryManager = require('./entry-manager');
const ExitManager = require('./exit-manager');
const TimingOptimizer = require('./timing-optimizer');
const PositionSizer = require('./position-sizer');
const RiskCalculator = require('./risk-calculator');
const StopLossOptimizer = require('./stop-loss-optimizer');
const TelegramFormatter = require('./telegram-formatter');

class SignalGenerator {
  constructor(config = {}) {
    this.entryManager = new EntryManager(config.entry);
    this.exitManager = new ExitManager(config.exit);
    this.timingOptimizer = new TimingOptimizer();
    this.positionSizer = new PositionSizer(config.position);
    this.riskCalculator = new RiskCalculator();
    this.stopLossOptimizer = new StopLossOptimizer();
    this.telegramFormatter = new TelegramFormatter();
  }

  /**
   * Generate complete trading signal
   */
  generate(approvedSignal, mtfa, ensemble, qualityScore) {
    console.log("\n📝 [SignalGenerator] Generating final trading signal...");

    // Step 16: Entry/Exit
    const entry = this.entryManager.calculateEntry(approvedSignal, mtfa);
    const exits = this.exitManager.calculateExits(approvedSignal, ensemble);
    const timing = this.timingOptimizer.analyzeTiming();

    // Step 17: Risk Management
    const positionSize = this.positionSizer.calculateSize(approvedSignal);
    const riskMetrics = this.riskCalculator.calculateRiskMetrics(approvedSignal, positionSize);
    const optimizedSL = this.stopLossOptimizer.optimizeStopLoss(approvedSignal, mtfa);

    // Final Signal
    const finalSignal = {
      id: this.generateSignalID(),
      timestamp: new Date().toISOString(),
      pair: approvedSignal.pair,
      direction: approvedSignal.signal,

      entry: {
        type: entry.type,
        price: entry.price,
        conditions: entry.conditions
      },

      exits: {
        stopLoss: exits.stopLoss.price,
        takeProfit: exits.takeProfit.price,
        trailing: exits.trailingStop,
        partial: exits.partialTP,
        optimizedStopLoss: optimizedSL
      },

      position: {
        size: positionSize.lots,
        units: positionSize.size,
        risk: `${positionSize.riskPercentage}%`,
        potentialLoss: positionSize.potentialLoss,
        potentialProfit: positionSize.potentialProfit
      },

      risk: riskMetrics,
      timing: timing,
      quality: {
        score: qualityScore.score,
        grade: qualityScore.grade
      },

      analysis: approvedSignal.reasoning,
      confidence: approvedSignal.confidence
    };

    console.log("✅ Final trading signal generated");
    return finalSignal;
  }

  generateSignalID() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SIG-${timestamp}-${random}`;
  }

  /**
   * Format for Telegram delivery
   */
  formatForTelegram(signal) {
    return this.telegramFormatter.format(signal);
  }
}

module.exports = SignalGenerator;
