// test/test-signal-generation.js
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const EnsemblePredictor = require("../ml-pipeline/prediction/ensemble-predictor");
const AIValidator = require("../ai-validation/ai-validator");
const MarketContext = require("../ai-validation/market-context");
const DecisionEngine = require("../ai-validation/decision-engine");
const SignalComposer = require("../ai-validation/signal-composer");

// Phase 4
const FilterEngine = require("../quality-control/filter-engine");
const SignalValidator = require("../quality-control/signal-validator");
const QualityScorer = require("../quality-control/quality-scorer");
const FinalApproval = require("../quality-control/final-approval");

// Phase 5
const SignalGenerator = require("../signal-generation/signal-generator");

require("dotenv").config();

async function testSignalGeneration() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   PHASE 5 TEST - SIGNAL GENERATION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // ===== Phase 1 =====
    console.log("📊 Phase 1: MTFA...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    console.log("✅ Phase 1 complete\n");

    // ===== Phase 2 =====
    console.log("🤖 Phase 2: Ensemble...");
    const indicators = await SwingIndicators.calculateAll(mtfaResult.dailyCandles);
    const ensemble = new EnsemblePredictor();

    const fs = require("fs");
    const path = require("path");
    const versions = fs.readdirSync(path.join(__dirname, "../saved-models"))
      .filter(f => f.startsWith("v") || f.startsWith("test_"))
      .sort();

    if (versions.length === 0) throw new Error("No models found in /saved-models");

    await ensemble.loadModels(path.join(__dirname, "../saved-models", versions[versions.length - 1]));
    const ensembleResult = await ensemble.predict(mtfaResult.dailyCandles, indicators);
    console.log("✅ Phase 2 complete\n");

    // ===== Phase 3 =====
    console.log("🧠 Phase 3: AI Validation + Market Context...");
    const marketContext = new MarketContext();
    const context = marketContext.analyze(mtfaResult.dailyCandles, indicators, ensembleResult);

    const aiValidator = new AIValidator();
    const aiValidation = await aiValidator.validate(ensembleResult, mtfaResult, context);
    console.log("✅ Phase 3 complete\n");

    // ===== Phase 3.5 =====
    console.log("🎯 Decision Engine...");
    const decisionEngine = new DecisionEngine();
    const finalDecision = decisionEngine.makeDecision(mtfaResult, ensembleResult, aiValidation, context);

    const signalComposer = new SignalComposer();
    const signal = signalComposer.compose(finalDecision, mtfaResult, ensembleResult, aiValidation, context);
    console.log("✅ Decision Engine complete\n");

    // ===== Phase 4 =====
    console.log("🔍 Phase 4: Quality Control...");
    const filterEngine = new FilterEngine();
    const filterResults = filterEngine.runFilters(signal, mtfaResult, ensembleResult);

    const validator = new SignalValidator();
    const validationResult = validator.validate(signal);

    const scorer = new QualityScorer();
    const qualityScore = scorer.calculateScore(signal, filterResults, validationResult);

    const approval = new FinalApproval();
    const finalApproval = approval.approve(signal, filterResults, validationResult, qualityScore);
    console.log("✅ Phase 4 complete\n");

    // ===== Phase 5 =====
    console.log("📢 Phase 5: Signal Generation...");
    const signalGenerator = new SignalGenerator({
      position: { accountBalance: 10000, riskPercentage: 1 },
      entry: { useMarketEntry: true },
      exit: { useTrailingStop: true, partialTakeProfit: true }
    });

    const tradingSignal = signalGenerator.generate(signal, mtfaResult, ensembleResult, qualityScore);
    const telegramMessage = signalGenerator.formatForTelegram(tradingSignal);
    console.log("✅ Phase 5 complete\n");

    // ===== Final Output =====
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   📢 FINAL TRADING SIGNAL (Telegram Format)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(telegramMessage);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ End-to-End Phase 5 Pipeline Complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, signal: tradingSignal };

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testSignalGeneration()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = testSignalGeneration;
