// backtesting/backtest-runner.js
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

    // Rejection tracking
    this.rejectionStats = {
      totalWindows: 0,
      phase2MLRejected: 0,
      phase3DecisionRejected: 0,
      phase4FiltersRejected: 0,
      phase4QualityRejected: 0,
      phase4ApprovalRejected: 0,
      approved: 0
    };
  }

  async runBacktest(historicalCandles) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   PHASE 7: BACKTESTING");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`Starting backtest with ${historicalCandles.length} candles`);
    console.log(`Initial Balance: $${this.startBalance}`);
    console.log(`Risk per Trade: ${this.riskPerTrade}%\n`);

    const trades = [];
    const windowSize = 100;

    // Load models once
    const ensemble = new EnsemblePredictor();
    const fs = require("fs");
    const path = require("path");
    const versions = fs.readdirSync(path.join(__dirname, "../saved-models"))
      .filter(f => f.startsWith("v") || f.startsWith("test_"))
      .sort();
    
    if (versions.length === 0) throw new Error("No models found");
    
    console.log("Loading models...");
    await ensemble.loadModels(path.join(__dirname, "../saved-models", versions[versions.length - 1]));
    console.log("Models loaded successfully\n");

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

    const totalWindows = historicalCandles.length - windowSize;
    console.log(`Total rolling windows to process: ${totalWindows}\n`);

    // Rolling window backtest
    for (let i = windowSize; i < historicalCandles.length; i++) {
      this.rejectionStats.totalWindows++;
      
      const currentWindow = historicalCandles.slice(i - windowSize, i + 1);
      const currentCandle = currentWindow[currentWindow.length - 1];

      try {
        // Phase 1 & 2: Indicators + Ensemble
        const indicators = await SwingIndicators.calculateAll(currentWindow);
        
        const mtfaResult = {
          dailyCandles: currentWindow,
          biases: { daily: "BULLISH", weekly: "BULLISH", monthly: "BULLISH" },
          overallBias: "BULLISH",
          confidence: 85,
          daily: { indicators }
        };

        const ensembleResult = await ensemble.predict(currentWindow, indicators);
        
        // Phase 3: AI Validation + Decision
        const marketContext = new MarketContext();
        const context = marketContext.analyze(currentWindow, indicators, ensembleResult);

        let aiValidation;
        if (this.useAIValidation) {
          aiValidation = await aiValidator.validate(ensembleResult, mtfaResult, context);
        } else {
          aiValidation = {
            validation: ensembleResult.confidence > 0.5 ? "APPROVE" : "REJECT",
            aiConfidence: ensembleResult.confidence,
            reasoning: "Backtesting mode - AI skipped",
            risks: [],
            opportunities: [],
            quality: Math.round(ensembleResult.confidence * 100),
            recommendations: ""
          };
        }

        const finalDecision = decisionEngine.makeDecision(mtfaResult, ensembleResult, aiValidation, context);
        
        if (finalDecision.decision === "NO_SIGNAL") {
          this.rejectionStats.phase3DecisionRejected++;
          continue;
        }

        const signal = signalComposer.compose(finalDecision, mtfaResult, ensembleResult, aiValidation, context);

        // Phase 4: Quality Control
        const filterResults = filterEngine.runFilters(signal, mtfaResult, ensembleResult);
        
        if (!filterResults.passed) {
          this.rejectionStats.phase4FiltersRejected++;
          continue;
        }

        const validationResult = validator.validate(signal);
        const qualityScore = scorer.calculateScore(signal, filterResults, validationResult);
        
        if (qualityScore.score < 50) {
          this.rejectionStats.phase4QualityRejected++;
          continue;
        }

        const finalApproval = approval.approve(signal, filterResults, validationResult, qualityScore);

        if (!finalApproval.approved) {
          this.rejectionStats.phase4ApprovalRejected++;
          continue;
        }

        this.rejectionStats.approved++;

        // Phase 5: Generate trading signal
        const tradingSignal = signalGenerator.generate(signal, mtfaResult, ensembleResult, qualityScore);

        if (tradingSignal.direction !== "NO_SIGNAL") {
          const trade = this.tradeSimulator.executeTrade(
            tradingSignal,
            currentCandle,
            historicalCandles.slice(i + 1, i + 20)
          );

          if (trade) {
            trades.push(trade);
            console.log(`✅ Trade #${trades.length}: ${trade.direction} at ${currentCandle.timestamp} - ${trade.outcome}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error at candle ${i}:`, error.message);
        continue;
      }

      // Progress update every 50 candles
      if (i % 50 === 0) {
        const progress = ((i - windowSize) / totalWindows * 100).toFixed(1);
        console.log(`Progress: ${progress}% (${i - windowSize}/${totalWindows} windows)`);
      }
    }

    // Final Statistics
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   REJECTION BREAKDOWN");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`Total Windows Processed: ${this.rejectionStats.totalWindows}`);
    console.log(`Phase 3 Decision Rejected: ${this.rejectionStats.phase3DecisionRejected} (${(this.rejectionStats.phase3DecisionRejected/this.rejectionStats.totalWindows*100).toFixed(1)}%)`);
    console.log(`Phase 4 Filters Rejected: ${this.rejectionStats.phase4FiltersRejected} (${(this.rejectionStats.phase4FiltersRejected/this.rejectionStats.totalWindows*100).toFixed(1)}%)`);
    console.log(`Phase 4 Quality Score Rejected: ${this.rejectionStats.phase4QualityRejected} (${(this.rejectionStats.phase4QualityRejected/this.rejectionStats.totalWindows*100).toFixed(1)}%)`);
    console.log(`Phase 4 Final Approval Rejected: ${this.rejectionStats.phase4ApprovalRejected} (${(this.rejectionStats.phase4ApprovalRejected/this.rejectionStats.totalWindows*100).toFixed(1)}%)`);
    console.log(`✅ APPROVED SIGNALS: ${this.rejectionStats.approved} (${(this.rejectionStats.approved/this.rejectionStats.totalWindows*100).toFixed(1)}%)`);
    console.log(`\n✅ Backtest complete!`);
    console.log(`Total trades executed: ${trades.length}\n`);

    return trades;
  }
}

module.exports = BacktestRunner;
