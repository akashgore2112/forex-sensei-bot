// ml-pipeline/training/model-trainer.js
const fs = require("fs");
const path = require("path");
const RandomForestClassifier = require("../models/random-forest-classifier");
const LSTMPredictor = require("../models/lstm-predictor");
const DataPreprocessor = require("./data-preprocessor");
const ModelEvaluator = require("./model-evaluator");

class ModelTrainer {
  constructor(config = {}) {
    this.savePath = config.savePath || path.join(__dirname, "../../saved-models");
    this.version = config.version || `test-v${Date.now()}`;
    this.preprocessor = new DataPreprocessor();
    this.evaluator = new ModelEvaluator();
  }

  async trainAll(candles) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   PHASE 2 TRAINING - MODEL TRAINER");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!candles || candles.length < 200) {
      throw new Error("❌ Not enough candles provided for training (need 200+)");
    }

    console.log(`📊 Total candles received: ${candles.length}`);

    // Step 1: Preprocess dataset
    console.log("\n🔄 Preprocessing dataset...");
    const dataset = await this.preprocessor.prepareDataset(candles);

    console.log(`✅ Dataset prepared`);
    console.log(`   Raw candles: ${dataset.rawCandles.length}`);
    console.log(`   Features shape: ${dataset.features.length}x${dataset.features[0]?.length || 0}`);
    console.log(`   Labels available: ${dataset.labels ? dataset.labels.length : 0}`);

    const results = {};

    // Step 2: Train Random Forest
    console.log("\n🌲 Training Random Forest...");
    const rf = new RandomForestClassifier();
    try {
      await rf.train(dataset);
      results.randomForest = {
        success: true,
        trainingMetrics: rf.trainingMetrics,
        testMetrics: rf.testMetrics
      };
      console.log(`   ✅ RF trained | Train Acc: ${(rf.trainingMetrics?.accuracy * 100).toFixed(2)}%`);
    } catch (err) {
      console.error("❌ RF training failed:", err.message);
      results.randomForest = { success: false };
    }

    // Step 3: Train LSTM
    console.log("\n📈 Training LSTM...");
    const lstm = new LSTMPredictor();
    try {
      if (!dataset.rawCandles || dataset.rawCandles.length < 100) {
        throw new Error("Not enough candles for LSTM (need 100+)");
      }

      await lstm.train(dataset);
      const finalLoss = lstm.trainingHistory?.history?.loss?.slice(-1)[0] ?? null;
      const finalValLoss = lstm.trainingHistory?.history?.val_loss?.slice(-1)[0] ?? null;

      if (!finalLoss || !finalValLoss) {
        console.warn("⚠️ LSTM training finished but no loss history found!");
      }

      results.lstm = {
        success: true,
        trainingMetrics: {
          finalLoss: finalLoss,
          finalValLoss: finalValLoss
        },
        testMetrics: lstm.testMetrics
      };

      console.log(
        `   ✅ LSTM trained | Final Loss: ${finalLoss}, Val Loss: ${finalValLoss}, Test MAE: ${lstm.testMetrics?.mae}`
      );
    } catch (err) {
      console.error("❌ LSTM training failed:", err.message);
      results.lstm = { success: false };
    }

    // Step 4: Save models
    await this._saveModels(rf, lstm);
    await this._saveTrainingSummary(results);

    console.log("\n✅ Training complete!");
    return results;
  }

  async _saveModels(rf, lstm) {
    const versionPath = path.join(this.savePath, this.version);
    if (!fs.existsSync(versionPath)) {
      fs.mkdirSync(versionPath, { recursive: true });
    }

    // Save RF
    try {
      fs.writeFileSync(
        path.join(versionPath, "rf-model.json"),
        JSON.stringify(rf.export(), null, 2)
      );
      console.log("💾 RF model saved");
    } catch (err) {
      console.error("❌ Failed to save RF model:", err.message);
    }

    // Save LSTM
    try {
      await lstm.save(path.join(versionPath, "lstm-model"));
      console.log("💾 LSTM model saved");
    } catch (err) {
      console.error("❌ Failed to save LSTM model:", err.message);
    }
  }

  async _saveTrainingSummary(results) {
    const versionPath = path.join(this.savePath, this.version);
    const summaryPath = path.join(versionPath, "training-summary.json");

    const summary = {
      version: this.version,
      trainedAt: new Date().toISOString(),
      models: {
        randomForest: {
          success: results.randomForest.success,
          trainingAccuracy: results.randomForest.trainingMetrics?.accuracy ?? 0,
          testAccuracy: results.randomForest.testMetrics?.accuracy ?? 0,
          testMacroF1: results.randomForest.testMetrics?.macroF1 ?? 0
        },
        lstm: {
          success: results.lstm.success,
          trainingLoss: results.lstm.trainingMetrics?.finalLoss ?? 0,
          valLoss: results.lstm.trainingMetrics?.finalValLoss ?? 0,
          testMAE: results.lstm.testMetrics?.mae ?? 0,
          testRMSE: results.lstm.testMetrics?.rmse ?? 0
        }
      }
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log("📄 Training summary saved at", summaryPath);
  }
}

module.exports = ModelTrainer;
