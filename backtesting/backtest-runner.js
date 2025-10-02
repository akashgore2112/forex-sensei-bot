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

class BacktestRunner {
  constructor(config = {}) {
    this.startBalance = config.startBalance || 10000;
    this.riskPerTrade = config.riskPerTrade || 1;
    this.useAIValidation = config.useAIValidation !== false;

    this.tradeSimulator = new TradeSimulator({
      startBalance: this.startBalance,
      riskPerTrade: this.riskPerTrade
    });
  }

  /**
   * Run backtest on historical candles
   * @param {Array} historicalCandles
   */
  async runBacktest(historicalCandles) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   PHASE 7: BACKTESTING");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`Starting backtest with ${historicalCandles.length} candles`);
    console.log(`Initial Balance: $${this.startBalance}`);
    console.log(`Risk per Trade: ${this.riskPerTrade}%\n`);

    const trades = [];
    const windowSize = 100; // need 100 candles for MTFA & indicators

    // Load ML models once
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
        // Phase 1: Indicators
        const indicators = await SwingIndicators.calculateAll(currentWindow);

        const mtfaResult = {
          dailyCandles: currentWindow,
          biases: { daily: "BULLISH", weekly: "BULLISH", monthly: "BULLISH" },
          overallBias: "BULLISH",
          confidence: 85,
          daily: { indicators }
        };

        // Phase 2: Ensemble predictions
        const ensembleResult = await ensemble.predict(currentWindow, indicators);

        // Phase 3: Market context
        const marketContext = new MarketContext();
        const context = marketContext.analyze(currentWindow, indicators, ensembleResult);

        // AI validation (optional for speed)
        let aiValidation;
        if (this.useAIValidation) {
          aiValidation = await aiValidator.validate(ensembleResult, mtfaResult, context);
        } else {
          aiValidation = {
            validation: ensembleResult.confidence > 0.6 ? "APPROVE" : "REJECT",
            aiConfidence: ensembleResult.confidence,
            reasoning: "Backtest mode - AI skipped",
            risks: [],
            opportunities: [],
            quality: Math.round(ensembleResult.confidence * 100),
            recommendations: ""
          };
        }

        // Phase 3: Decision
        const finalDecision = decisionEngine.makeDecision(mtfaResult, ensembleResult, aiValidation, context);

        // Phase 3.5: Compose signal
        const signal = signalComposer.compose(finalDecision, mtfaResult, ensembleResult, aiValidation, context);

        // Phase 4: Quality Control
        const filterResults = filterEngine.runFilters(signal, mtfaResult, ensembleResult);
        const validationResult = validator.validate(signal);
        const qualityScore = scorer.calculateScore(signal, filterResults, validationResult);
        const finalApproval = approval.approve(signal, filterResults, validationResult, qualityScore);

        if (!finalApproval.approved) continue; // Skip bad signals

        // Phase 5: Signal Generation
        const tradingSignal = signalGenerator.generate(signal, mtfaResult, ensembleResult, qualityScore);

        if (tradingSignal.direction !== "NO_SIGNAL") {
          // Simulate trade execution
          const trade = this.tradeSimulator.executeTrade(
            tradingSignal,
            currentCandle,
            historicalCandles.slice(i + 1, i + 20) // Next 20 candles for trade outcome
          );

          if (trade) {
            trades.push(trade);
            console.log(`Trade #${trades.length}: ${trade.direction} at ${currentCandle.time} → ${trade.outcome}`);
          }
        }
      } catch (err) {
        console.error(`Error at candle ${i}:`, err.message);
        continue;
      }

      // Progress every 100 candles
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
