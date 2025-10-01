// ============================================================================
// 🧪 Phase 3 - Step 10.5: AI Validator Test
// Runs full pipeline: MTFA → Ensemble → AI Validation
// ============================================================================

const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const EnsemblePredictor = require("../ml-pipeline/prediction/ensemble-predictor");
const AIValidator = require("../ai-validation/ai-validator");
require("dotenv").config();

async function testAIValidator() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   PHASE 3 - STEP 10 TEST");
  console.log("   AI VALIDATOR");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // ✅ Step 1: Check API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("❌ OPENAI_API_KEY not found in .env file");
    }

    // ✅ Step 2: Run Phase 1 - MTFA
    console.log("📊 Fetching MTFA data...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    console.log("✅ MTFA complete\n");

    // ✅ Step 3: Run Phase 2 - Ensemble
    console.log("🤖 Running ensemble prediction...");
    const indicators = await SwingIndicators.calculateAll(mtfaResult.dailyCandles);
    const ensemble = new EnsemblePredictor();
    await ensemble.loadModels("./saved-models/v1"); // path adjust if needed
    const ensembleResult = await ensemble.predict(mtfaResult.dailyCandles, indicators);
    console.log("✅ Ensemble complete\n");

    // ✅ Step 4: Run Phase 3 - AI Validation
    console.log("🤖 Requesting AI validation...");
    const aiValidator = new AIValidator();
    const aiValidation = await aiValidator.validate(ensembleResult, mtfaResult);

    // ✅ Step 5: Show Results
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   AI VALIDATION RESULT");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(JSON.stringify(aiValidation, null, 2));
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ AI Validator Test Complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, validation: aiValidation };
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run directly if script is executed
if (require.main === module) {
  testAIValidator()
    .then((result) => process.exit(result.success ? 0 : 1))
    .catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = testAIValidator;
