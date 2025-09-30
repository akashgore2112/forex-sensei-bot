// ============================================================================
// 🧪 Test - Model Trainer (Phase 2 - Step 8.2)
// ============================================================================
const ModelTrainer = require("../ml-pipeline/training/model-trainer");
const runPreprocessorTest = require("./test-preprocessor"); // Step 8.1 output

async function runTrainerTest() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   STEP 8.2 - MODEL TRAINER TEST");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Step 1: Run preprocessor
  const { success, dataset } = await runPreprocessorTest();
  if (!success) throw new Error("❌ Preprocessor failed, cannot train models");

  // Step 2: Train all models
  const trainer = new ModelTrainer({ version: "v2" });
  const results = await trainer.trainAll(dataset);

  console.log("\n📊 Training Results:");
  console.log(JSON.stringify(results, null, 2));

  console.log("\n✅ Step 8.2 Model Trainer Test Completed!");
}

if (require.main === module) {
  runTrainerTest().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = runTrainerTest;
