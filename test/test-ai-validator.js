// test/test-ai-validator.js
const path = require("path");
const fs = require("fs");
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const EnsemblePredictor = require("../ml-pipeline/prediction/ensemble-predictor");
const AIValidator = require("../ai-validation/ai-validator");
const MarketContext = require("../ai-validation/market-context"); // ✅ Step 11 added
require("dotenv").config();

async function testAIValidator() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   PHASE 3 - STEP 10 + 11 TEST");
  console.log("   AI VALIDATOR with Market Context");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("❌ OPENAI_API_KEY not found in .env file");
    }

    console.log("📊 Fetching MTFA data...");
    const mtfaResult = await MTFA.analyze("EUR/USD");
    console.log("✅ MTFA complete\n");

    console.log("🤖 Running ensemble prediction...");
    const indicators = await SwingIndicators.calculateAll(mtfaResult.dailyCandles);
    const ensemble = new EnsemblePredictor();
    
    // Find latest model version
    const savedModelsPath = path.join(__dirname, "../saved-models");
    const versions = fs.readdirSync(savedModelsPath)
      .filter(f => f.startsWith("v") || f.startsWith("test_"))
      .sort();
    
    if (versions.length === 0) {
      throw new Error("No trained models found. Run test-trainer.js first.");
    }

    const modelPath = path.join(savedModelsPath, versions[versions.length - 1]);
    console.log(`   Using models: ${versions[versions.length - 1]}`);
    
    await ensemble.loadModels(modelPath);
    const ensembleResult = await ensemble.predict(mtfaResult.dailyCandles, indicators);
    console.log("✅ Ensemble complete\n");

    // ✅ Step 11: Market Context Analysis
    console.log("📊 Analyzing market context...");
    const marketContext = new MarketContext();
    const context = marketContext.analyze(mtfaResult.dailyCandles, indicators, ensembleResult);
    console.log("✅ Market context analyzed\n");

    console.log("🤖 Requesting AI validation from GPT-4...");
    const aiValidator = new AIValidator();
    const aiValidation = await aiValidator.validate(ensembleResult, mtfaResult, context);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   AI VALIDATION RESULT (with Context)");
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

if (require.main === module) {
  testAIValidator()
    .then((result) => process.exit(result.success ? 0 : 1))
    .catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}

module.exports = testAIValidator;
