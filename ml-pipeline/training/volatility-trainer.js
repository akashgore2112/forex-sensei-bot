// ============================================================================
// ⚡ Training pipeline for Volatility Predictor (Phase 2 - Step 1.3)
// Updated: Python XGBoost backend
// ============================================================================

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

class VolatilityTrainer {
  constructor() {
    this.modelPath = path.join(__dirname, "../../saved-models/volatility-model.xgb"); 
    this.pythonScript = path.join(__dirname, "volatility_trainer.py");
  }

  /**
   * 📌 Train model with historical market data using Python backend
   * @param {Array} historicalData - Array of candle objects with indicators
   */
  async trainVolatilityModel(historicalData) {
    if (!historicalData || historicalData.length < 500) {
      throw new Error(
        `❌ Not enough candles. Got ${historicalData?.length || 0}, need at least 500`
      );
    }

    console.log("\n───────────────────────────────────────────────");
    console.log("📊 Starting volatility model training (Python backend)...");
    console.log(`   Input candles: ${historicalData.length}`);
    console.log("───────────────────────────────────────────────\n");

    return new Promise((resolve, reject) => {
      const py = spawn("python3", [this.pythonScript]);

      let output = "";
      let error = "";

      py.stdout.on("data", (data) => {
        output += data.toString();
      });

      py.stderr.on("data", (data) => {
        error += data.toString();
      });

      py.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(`❌ Python script failed: ${error}`));
        }

        try {
          const result = JSON.parse(output.trim());

          if (result.error) {
            return reject(new Error(result.error));
          }

          console.log("\n📈 Training Summary:");
          console.log(`   ✅ Total Samples:   ${result.samples}`);
          console.log(`   ✅ Train Size:      ${result.trainSize}`);
          console.log(`   ✅ Test Size:       ${result.testSize}`);
          console.log(`   📉 Mean Abs. Error: ${result.mae.toFixed(6)}\n`);

          console.log(`💾 Volatility model saved to: ${result.modelPath}`);

          resolve(result);
        } catch (err) {
          reject(new Error(`❌ Failed to parse Python output: ${output}\n${err.message}`));
        }
      });

      // Send candles to Python
      py.stdin.write(JSON.stringify(historicalData));
      py.stdin.end();
    });
  }

  /**
   * 📌 Load existing model (placeholder, actual prediction via Python will be added later)
   */
  async loadExistingModel() {
    if (!fs.existsSync(this.modelPath)) {
      throw new Error("❌ Saved model not found");
    }
    console.log(`📂 Volatility model found at ${this.modelPath}`);
    console.log("✅ Model is ready (Python will handle loading for prediction).");
    return true;
  }

  /**
   * 📌 Get predictor instance
   */
  getPredictor() {
    return {
      predict: () => {
        throw new Error("❌ Prediction not yet implemented in Python bridge");
      }
    };
  }
}

module.exports = VolatilityTrainer;
