// ============================================================================
// 🧪 Test - Model Evaluator (Phase 2 - Step 8.3)
// Goal: Verify centralized evaluation for classification + regression models
// ============================================================================

const ModelEvaluator = require("../ml-pipeline/training/model-evaluator");

async function runEvaluatorTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STEP 8.3 - MODEL EVALUATOR TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const evaluator = new ModelEvaluator();

    // ========================================================================
    // Test 1: Classification Metrics
    // ========================================================================
    console.log("📊 Running Classification Evaluation...");
    const yTrueCls = ["BUY", "SELL", "HOLD", "BUY", "SELL", "HOLD", "BUY"];
    const yPredCls = ["BUY", "SELL", "BUY", "SELL", "SELL", "HOLD", "HOLD"];

    const classificationResult = evaluator.evaluateClassification(yTrueCls, yPredCls);
    console.log("✅ Classification Metrics:\n", JSON.stringify(classificationResult, null, 2));

    // ========================================================================
    // Test 2: Regression Metrics
    // ========================================================================
    console.log("\n📉 Running Regression Evaluation...");
    const yTrueReg = [1.0, 1.5, 2.0, 2.5, 3.0];
    const yPredReg = [0.9, 1.4, 2.1, 2.6, 2.9];

    const regressionResult = evaluator.evaluateRegression(yTrueReg, yPredReg);
    console.log("✅ Regression Metrics:\n", JSON.stringify(regressionResult, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Step 8.3 Evaluator Test Completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, classificationResult, regressionResult };
  } catch (err) {
    console.error("\n❌ ERROR in Evaluator Test:");
    console.error(`   ${err.message}`);
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

if (require.main === module) {
  runEvaluatorTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

module.exports = runEvaluatorTest;
