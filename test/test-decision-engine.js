// test/test-decision-engine.js
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const EnsemblePredictor = require("../ml-pipeline/prediction/ensemble-predictor");
const AIValidator = require("../ai-validation/ai-validator");
const MarketContext = require("../ai-validation/market-context");
const DecisionEngine = require("../ai-validation/decision-engine");
const SignalComposer = require("../ai-validation/signal-composer");
require("dotenv").config();

async function testDecisionEngine() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   PHASE 3 - STEP 12 TEST");
  console.log("   DECISION ENGINE (Complete Pipeline)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not found");
    }

    // ===== Phase 1: MTFA =====
    console.log("📊 Phase 1: Running MTFA...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    console.log("✅ Phase 1 complete\n");

    // ===== Phase 2: Ensemble =====
    console.log("🤖 Phase 2: Running Ensemble...");
    const indicators = await SwingIndicators.calculateAll(mtfaResult.dailyCandles);
    const ensemble = new EnsemblePredictor();

    const fs = require("fs");
    const path = require("path");
    const savedModelsPath = path.join(__dirname, "../saved-models");
    const versions = fs.readdirSync(savedModelsPath)
      .filter(f => f.startsWith("v") || f.startsWith("test_"))
      .sort();

    if (versions.length === 0) throw new Error("No models found");

    await ensemble.loadModels(path.join(savedModelsPath, versions[versions.length - 1]));
    const ensembleResult = await ensemble.predict(mtfaResult.dailyCandles, indicators);
    console.log("✅ Phase 2 complete\n");

    // ===== Phase 3: AI Validation + Market Context =====
    console.log("🤖 Phase 3: AI Validation + Market Context...");
    const marketContext = new MarketContext();
    const context = marketContext.analyze(mtfaResult.dailyCandles, indicators, ensembleResult);

    const aiValidator = new AIValidator();
    const aiValidation = await aiValidator.validate(ensembleResult, mtfaResult, context);
    console.log("✅ Phase 3 complete\n");

    // ===== Phase 4: Final Decision =====
    console.log("🎯 Making final decision...");
    const decisionEngine = new DecisionEngine();
    const finalDecision = decisionEngine.makeDecision(
      mtfaResult,
      ensembleResult,
      aiValidation,
      context
    );
    console.log("✅ Decision complete\n");

    // ===== Phase 5: Signal Composer =====
    console.log("📝 Composing final signal...");
    const signalComposer = new SignalComposer();
    const finalSignal = signalComposer.compose(
      finalDecision,
      mtfaResult,
      ensembleResult,
      aiValidation,
      context
    );

    // ===== Results =====
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   FINAL TRADING SIGNAL");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(JSON.stringify(finalSignal, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Phase 3 Complete - Decision Engine Working!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, signal: finalSignal };
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testDecisionEngine()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = testDecisionEngine;
