// ============================================================================
// 🧪 Test - Model Trainer (Phase 2 - Step 8.2)
// Goal: Verify centralized training + saving of all models
// Author: Forex ML Pipeline
// ============================================================================

const ModelTrainer = require("../ml-pipeline/training/model-trainer");
const runPreprocessorTest = require("./test-preprocessor"); // Step 8.1 output

async function runTrainerTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STEP 8.2 - MODEL TRAINER TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Run preprocessor
    console.log("📊 Running preprocessor (Step 8.1)...");
    const { success, dataset } = await runPreprocessorTest();
    if (!success || !dataset) {
      throw new Error("❌ Preprocessor failed, cannot train models");
    }
    console.log("✅ Preprocessor completed");
    console.log(`   ➡️ Total Samples: ${dataset.metadata.totalSamples}`);
    console.log(`   ➡️ Train: ${dataset.metadata.trainSamples}, Val: ${dataset.metadata.valSamples}, Test: ${dataset.metadata.testSamples}\n`);

    // Step 2: Train all models
    console.log("🤖 Starting Model Training...\n");

    const trainer = new ModelTrainer({ version: "v2" });
    const results = await trainer.trainAll(dataset);

    // Step 3: Print Results
    console.log("\n📊 Training Results Summary:");
    for (const [model, result] of Object.entries(results)) {
      console.log(`- ${model}: ${result.saved ? "✅ Saved" : "⚠️ Not Saved"} → ${result.path || "N/A"}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Step 8.2 Model Trainer Test Completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, results };
  } catch (err) {
    console.error("\n❌ ERROR in Trainer Test:");
    console.error(`   ${err.message}`);
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

if (require.main === module) {
  runTrainerTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

module.exports = runTrainerTest;
