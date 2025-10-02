// test/test-quality-control.js

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const EnsemblePredictor = require("../ml-pipeline/prediction/ensemble-predictor");
const AIValidator = require("../ai-validation/ai-validator");
const MarketContext = require("../ai-validation/market-context");
const DecisionEngine = require("../ai-validation/decision-engine");
const SignalComposer = require("../ai-validation/signal-composer");

// Phase 4 modules
const FilterEngine = require("../quality-control/filter-engine");
const SignalValidator = require("../quality-control/signal-validator");
const QualityScorer = require("../quality-control/quality-scorer");
const FinalApproval = require("../quality-control/final-approval");

require("dotenv").config();

async function testQualityControl() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   PHASE 4 TEST - QUALITY CONTROL");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Run Phases 1-3 first
    console.log("Running Phases 1-3...\n");

    // Phase 1: MTFA
    const mtfaResult = await MTFA.analyze("EUR/USD");

    // Indicators
    const indicators = await SwingIndicators.calculateAll(mtfaResult.dailyCandles);

    // Phase 2: Ensemble
    const ensemble = new EnsemblePredictor();
    const fs = require("fs");
    const path = require("path");
    const versions = fs.readdirSync(path.join(__dirname, "../saved-models"))
      .filter(f => f.startsWith("v") || f.startsWith("test_"))
      .sort();

    if (versions.length === 0) throw new Error("No saved models found");

    await ensemble.loadModels(path.join(__dirname, "../saved-models", versions[versions.length - 1]));
    const ensembleResult = await ensemble.predict(mtfaResult.dailyCandles, indicators);

    // Phase 3: AI Validation + Context
    const marketContext = new MarketContext();
    const context = marketContext.analyze(mtfaResult.dailyCandles, indicators, ensembleResult);

    const aiValidator = new AIValidator();
    const aiValidation = await aiValidator.validate(ensembleResult, mtfaResult, context);

    // Decision Engine (Phase 3 end)
    const decisionEngine = new DecisionEngine();
    const finalDecision = decisionEngine.makeDecision(mtfaResult, ensembleResult, aiValidation, context);

    const signalComposer = new SignalComposer();
    const signal = signalComposer.compose(finalDecision, mtfaResult, ensembleResult, aiValidation, context);

    console.log("✅ Phases 1-3 complete\n");

    // ==========================
    // Phase 4: QUALITY CONTROL
    // ==========================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   PHASE 4: QUALITY CONTROL");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Step 13: Filters
    const filterEngine = new FilterEngine();
    const filterResults = filterEngine.runFilters(signal, mtfaResult, ensembleResult);

    // Step 14: Signal Validation
    const validator = new SignalValidator();
    const validationResult = validator.validate(signal);

    // Step 15.1: Quality Score
    const scorer = new QualityScorer();
    const qualityScore = scorer.calculateScore(signal, filterResults, validationResult);

    // Step 15.2: Final Approval
    const approval = new FinalApproval();
    const finalApproval = approval.approve(signal, filterResults, validationResult, qualityScore);

    // ==========================
    // Final Output
    // ==========================
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   QUALITY CONTROL RESULT");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const result = {
      signal: signal.signal,
      approved: finalApproval.approved,
      qualityGrade: finalApproval.grade,
      qualityScore: qualityScore.score,
      filterResults: filterEngine.getFilterSummary(filterResults.results),
      validationErrors: validationResult.errors.length,
      reason: finalApproval.reason
    };

    console.log(JSON.stringify(result, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Phase 4 Complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, result };

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testQualityControl()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = testQualityControl;
