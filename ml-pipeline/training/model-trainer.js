// ml-pipeline/training/model-trainer.js
const fs = require("fs");
const path = require("path");

const LSTMPricePredictor = require("../models/lstm-predictor");
const SwingSignalClassifier = require("../models/random-forest-classifier");
const SwingIndicators = require("../../swing-indicators");

class ModelTrainer {
  constructor(config = {}) {
    this.basePath = config.basePath || path.join(__dirname, "../../saved-models");
    this.version = config.version || `v${Date.now()}`;
    this.saveModels = config.saveModels ?? true;

    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async trainAll(dataset, options = {}) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   TRAINING ALL ML MODELS [${this.version}]`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const results = {};

    results.randomForest = await this.trainRandomForest(dataset, options);
    results.lstm = await this.trainLSTM(dataset, options);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All ML models trained successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    this._saveTrainingSummary(results);

    return results;
  }

  async trainRandomForest(dataset, options = {}) {
    console.log("🌲 Training Random Forest Classifier...");

    if (!dataset.rawCandles || dataset.rawCandles.length === 0) {
      throw new Error("❌ No raw candles available");
    }

    // Recalculate indicators for raw candles
    console.log("   📊 Calculating indicators for training data...");
    const indicators = await SwingIndicators.calculateAll(dataset.rawCandles);

    // Merge indicators into candles
    const candlesWithIndicators = dataset.rawCandles.map((candle, i) => ({
      ...candle,
      ema20: indicators.ema20[i] || 0,
      ema50: indicators.ema50[i] || 0,
      ema200: indicators.ema200[i] || 0,
      rsi: indicators.rsi14[i] || 0,
      macd: {
        macd: indicators.macd?.macd[i] || 0,
        signal: indicators.macd?.signal[i] || 0,
        histogram: indicators.macd?.histogram[i] || 0
      },
      atr: indicators.atr[i] || 0,
      adx: indicators.adx[i] || 0,
      prevClose: i > 0 ? dataset.rawCandles[i-1].close : candle.close,
      avgVolume: candle.volume || 1
    }));

    const rf = new SwingSignalClassifier();
    const metrics = await rf.trainModel(candlesWithIndicators);

    const saveDir = path.join(this.basePath, this.version);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const savePath = path.join(saveDir, "rf-model.json");
    await rf.saveModel(savePath);

    console.log(`   ✅ Random Forest trained`);
    console.log(`   📊 Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   📊 F1-Score: ${(metrics.averageF1 * 100).toFixed(2)}%`);
    console.log(`   💾 Saved to: ${savePath}\n`);

    return { success: true, path: savePath, metrics };
  }

  async trainLSTM(dataset, options = {}) {
    console.log("🔮 Training LSTM Price Predictor...");

    if (!dataset.rawCandles || dataset.rawCandles.length < 100) {
      throw new Error("❌ Not enough candles");
    }

    // Recalculate indicators
    console.log("   📊 Calculating indicators for LSTM training...");
    const indicators = await SwingIndicators.calculateAll(dataset.rawCandles);

    // Merge indicators into candles
    const candlesWithIndicators = dataset.rawCandles.map((candle, i) => ({
      ...candle,
      ema20: indicators.ema20[i] || 0,
      rsi: indicators.rsi14[i] || 0,
      macd: indicators.macd?.macd[i] || 0,
      atr: indicators.atr[i] || 0
    }));

    const lstm = new LSTMPricePredictor();
    await lstm.buildModel();
    await lstm.trainModel(candlesWithIndicators);

    const saveDir = path.join(this.basePath, this.version);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const savePath = path.join(saveDir, "lstm-model");
    await lstm.model.save(`file://${savePath}`);

    const finalLoss = lstm.trainingHistory?.history?.loss?.slice(-1)[0];
    const finalValLoss = lstm.trainingHistory?.history?.val_loss?.slice(-1)[0];

    console.log(`   ✅ LSTM trained`);
    console.log(`   📊 Final Loss: ${finalLoss?.toFixed(6) || "N/A"}`);
    console.log(`   📊 Val Loss: ${finalValLoss?.toFixed(6) || "N/A"}`);
    console.log(`   💾 Saved to: ${savePath}\n`);

    return { 
      success: true, 
      path: savePath, 
      metrics: { finalLoss, finalValLoss }
    };
  }

  _saveTrainingSummary(results) {
    const saveDir = path.join(this.basePath, this.version);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const summary = {
      version: this.version,
      trainedAt: new Date().toISOString(),
      models: {
        randomForest: {
          success: results.randomForest.success,
          accuracy: results.randomForest.metrics?.accuracy,
          f1Score: results.randomForest.metrics?.averageF1
        },
        lstm: {
          success: results.lstm.success,
          finalLoss: results.lstm.metrics?.finalLoss,
          finalValLoss: results.lstm.metrics?.finalValLoss
        }
      }
    };

    const summaryPath = path.join(saveDir, "training-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`📋 Training summary saved to: ${summaryPath}`);
  }
}

module.exports = ModelTrainer;
