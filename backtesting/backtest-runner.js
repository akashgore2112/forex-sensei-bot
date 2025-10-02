// backtesting/backtest-runner.js
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const EnsemblePredictor = require("../ml-pipeline/prediction/ensemble-predictor");
const AIValidator = require("../ai-validation/ai-validator");
const MarketContext = require("../ai-validation/market-context");
const DecisionEngine = require("../ai-validation/decision-engine");
const SignalComposer = require("../ai-validation/signal-composer");
const FilterEngine = require("../quality-control/filter-engine");
const SignalValidator = require("../quality-control/signal-validator");
const QualityScorer = require("../quality-control/quality-scorer");
const FinalApproval = require("../quality-control/final-approval");
const SignalGenerator = require("../signal-generation/signal-generator");
const TradeSimulator = require("./trade-simulator");
const SignalReplay = require("./signal-replay"); // ✅ Added

class BacktestRunner {
  constructor(config = {}) {
    this.startBalance = config.startBalance || 10000;
    this.riskPerTrade = config.riskPerTrade || 1;
    this.useAIValidation = config.useAIValidation !== false;

    this.tradeSimulator = new TradeSimulator({
      startBalance: this.startBalance,
      riskPerTrade: this.riskPerTrade
    });

    this.signalReplay = new SignalReplay(); // ✅ Initialize replay
  }

  /**
   * Run backtest on historical data
   * @param {Array} historicalCandles - Full historical dataset
   */
  async runBacktest(historicalCandles) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   PHASE 7: BACKTESTING");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(`Starting backtest with ${historicalCandles.length} candles`);
    console.log(`Initial Balance: $${this.startBalance}`);
    console.log(`Risk per Trade: ${this.riskPerTrade}%\n`);

    const trades = [];
    const windowSize = 100; // Need 100 candles for MTFA + indicators

    // Load models once
    const ensemble = new EnsemblePredictor();
    const fs = require("fs");
    const path = require("path");
    const versions = fs.readdirSync(path.join(__dirname, "../saved-models"))
      .filter(f => f.startsWith("v") || f.startsWith("test_"))
      .sort();

    await ensemble.loadModels(path.join(__dirname, "../saved-models", versions[versions.length - 1]));

    const aiValidator = this.useAIValidation ? new AIValidator() : null;
    const decisionEngine = new DecisionEngine();
    const signalComposer = new SignalComposer();
    const filterEngine = new FilterEngine();
    const validator = new SignalValidator();
    const scorer = new QualityScorer();
    const approval = new FinalApproval();
    const signalGenerator = new SignalGenerator({ 
      position: { accountBalance: this.startBalance, riskPercentage: this.riskPerTrade } 
    });

    // Rolling window backtest
    for (let i = windowSize; i < historicalCandles.length; i++) {
      const currentWindow = historicalCandles.slice(i - windowSize, i + 1);
      const currentCandle = currentWindow[currentWindow.length - 1];

      try {
        // Run complete pipeline (Phases 1-5)
        const indicators = await SwingIndicators.calculateAll(currentWindow);

        const mtfaResult = {
          dailyCandles: currentWindow,
          biases: { daily: "BULLISH", weekly: "BULLISH", monthly: "BULLISH" },
          overallBias: "BULLISH",
          confidence: 85,
          daily: { indicators }
        };

        const ensembleResult = await ensemble.predict(currentWindow, indicators);

        const marketContext = new MarketContext();
        const context = marketContext.analyze(currentWindow, indicators, ensembleResult);

        let aiValidation;
        if (this.useAIValidation) {
          aiValidation = await aiValidator.validate(ensembleResult, mtfaResult, context);
        } else {
          aiValidation = {
            validation: ensembleResult.confidence > 0.6 ? "APPROVE" : "REJECT",
            aiConfidence: ensembleResult.confidence,
            reasoning: "Backtesting mode - AI skipped",
            risks: [],
            opportunities: [],
            quality: Math.round(ensembleResult.confidence * 100),
            recommendations: ""
          };
        }

        const finalDecision = decisionEngine.makeDecision(mtfaResult, ensembleResult, aiValidation, context);
        const signal = signalComposer.compose(finalDecision, mtfaResult, ensembleResult, aiValidation, context);

        // Quality Control
        const filterResults = filterEngine.runFilters(signal, mtfaResult, ensembleResult);
        const validationResult = validator.validate(signal);
        const qualityScore = scorer.calculateScore(signal, filterResults, validationResult);
        const finalApproval = approval.approve(signal, filterResults, validationResult, qualityScore);

        if (!finalApproval.approved) {
          continue; // Skip rejected signals
        }

        // Generate trading signal
        const tradingSignal = signalGenerator.generate(signal, mtfaResult, ensembleResult, qualityScore);

        if (tradingSignal.direction !== "NO_SIGNAL") {
          // ✅ Replay signal before simulation (debugging check)
          const replayResult = this.signalReplay.replay(
            tradingSignal,
            historicalCandles.slice(i + 1, i + 20)
          );
          console.log(`Replay Outcome: ${replayResult.outcome}`);

          // ✅ Simulate trade execution
          const trade = this.tradeSimulator.executeTrade(
            tradingSignal,
            currentCandle,
            historicalCandles.slice(i + 1, i + 20)
          );

          if (trade) {
            trades.push(trade);
            console.log(`Trade #${trades.length}: ${trade.direction} at ${currentCandle.time} - ${trade.outcome}`);
          }
        }

      } catch (error) {
        console.error(`Error at candle ${i}:`, error.message);
        continue;
      }

      // Progress update
      if (i % 100 === 0) {
        console.log(`Progress: ${i}/${historicalCandles.length} candles processed`);
      }
    }

    console.log("\n✅ Backtest complete!");
    console.log(`Total trades executed: ${trades.length}`);
    return trades;
  }
}

module.exports = BacktestRunner;
