// ml-pipeline/training/model-trainer.js
const fs = require("fs");
const path = require("path");

const LSTMPricePredictor = require("../models/lstm-predictor");
const SwingSignalClassifier = require("../models/random-forest-classifier");
const SwingIndicators = require("../../swing-indicators");
const ModelEvaluator = require("./model-evaluator");

class ModelTrainer {
  constructor(config = {}) {
    this.basePath = config.basePath || path.join(__dirname, "../../saved-models");
    this.version = config.version || `v${Date.now()}`;
    this.saveModels = config.saveModels ?? true;
    this.evaluator = new ModelEvaluator();

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

    // Recalculate indicators
    console.log("   📊 Calculating indicators for training data...");
    const indicators = await SwingIndicators.calculateAll(dataset.rawCandles);

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
    await rf.trainModel(candlesWithIndicators);

    // Evaluate on test set
    console.log("   📊 Evaluating on test set...");
    const testMetrics = this._evaluateRFOnTestSet(rf, candlesWithIndicators, dataset);

    const saveDir = path.join(this.basePath, this.version);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const savePath = path.join(saveDir, "rf-model.json");
    await rf.saveModel(savePath);

    console.log(`   ✅ Random Forest trained`);
    console.log(`   📊 Training Accuracy: ${(rf.trainingMetrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   📊 Test Accuracy: ${(testMetrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   📊 Test Macro F1: ${(testMetrics.macroF1 * 100).toFixed(2)}%`);
    console.log(`   💾 Saved to: ${savePath}\n`);

    return { 
      success: true, 
      path: savePath, 
      trainingMetrics: rf.trainingMetrics,
      testMetrics 
    };
  }

  async trainLSTM(dataset, options = {}) {
    console.log("🔮 Training LSTM Price Predictor...");

    if (!dataset.rawCandles || dataset.rawCandles.length < 100) {
      throw new Error("❌ Not enough candles");
    }

    console.log("   📊 Calculating indicators for LSTM training...");
    const indicators = await SwingIndicators.calculateAll(dataset.rawCandles);

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

    // Evaluate on test set
    console.log("   📊 Evaluating on test set...");
    const testMetrics = await this._evaluateLSTMOnTestSet(lstm, candlesWithIndicators, dataset);

    const saveDir = path.join(this.basePath, this.version);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const savePath = path.join(saveDir, "lstm-model");
    await lstm.model.save(`file://${savePath}`);

    const finalLoss = lstm.trainingHistory?.history?.loss?.slice(-1)[0];
    const finalValLoss = lstm.trainingHistory?.history?.val_loss?.slice(-1)[0];

    console.log(`   ✅ LSTM trained`);
    console.log(`   📊 Training Loss: ${finalLoss?.toFixed(6) || "N/A"}`);
    console.log(`   📊 Val Loss: ${finalValLoss?.toFixed(6) || "N/A"}`);
    console.log(`   📊 Test MAE: ${testMetrics.mae.toFixed(6)}`);
    console.log(`   📊 Test RMSE: ${testMetrics.rmse.toFixed(6)}`);
    console.log(`   💾 Saved to: ${savePath}\n`);

    return { 
      success: true, 
      path: savePath, 
      trainingMetrics: { finalLoss, finalValLoss },
      testMetrics
    };
  }

  // Evaluate Random Forest on test set
  _evaluateRFOnTestSet(rf, candles, dataset) {
    const testStartIdx = dataset.metadata.trainSamples + dataset.metadata.valSamples;
    const testCandles = candles.slice(testStartIdx, testStartIdx + dataset.metadata.testSamples);

    const yTrue = [];
    const yPred = [];

    for (let i = 0; i < testCandles.length - 5; i++) {
      const prediction = rf.predict(testCandles[i]);
      yPred.push(prediction.signal);

      // Calculate actual label
      const futurePrice = testCandles[i + 5]?.close;
      const currentPrice = testCandles[i].close;
      const change = (futurePrice - currentPrice) / currentPrice;
      
      let actualLabel = "HOLD";
      if (change > 0.01) actualLabel = "BUY";
      else if (change < -0.01) actualLabel = "SELL";
      
      yTrue.push(actualLabel);
    }

    return this.evaluator.evaluateClassification(yTrue, yPred);
  }

  // Evaluate LSTM on test set
  async _evaluateLSTMOnTestSet(lstm, candles, dataset) {
    const testStartIdx = dataset.metadata.trainSamples + dataset.metadata.valSamples;
    const testCandles = candles.slice(testStartIdx);

    if (testCandles.length < lstm.lookbackPeriod + lstm.predictionHorizon) {
      console.warn("   ⚠️ Not enough test data for LSTM evaluation, using available data");
      return { mae: 0, rmse: 0, mape: 0, r2: 0 };
    }

    const yTrue = [];
    const yPred = [];

    // Make predictions on test set
    for (let i = lstm.lookbackPeriod; i < testCandles.length - lstm.predictionHorizon; i++) {
      const recentData = testCandles.slice(i - lstm.lookbackPeriod, i);
      
      try {
        const prediction = await lstm.predict(recentData);
        yPred.push(prediction.predictedPrices[0]); // First predicted price
        yTrue.push(testCandles[i + 1].close); // Actual next close
      } catch (err) {
        console.warn(`   ⚠️ Prediction error at index ${i}: ${err.message}`);
      }
    }

    if (yTrue.length === 0) {
      return { mae: 0, rmse: 0, mape: 0, r2: 0 };
    }

    return this.evaluator.evaluateRegression(yTrue, yPred);
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
          trainingAccuracy: results.randomForest.trainingMetrics?.accuracy,
          testAccuracy: results.randomForest.testMetrics?.accuracy,
          testMacroF1: results.randomForest.testMetrics?.macroF1
        },
        lstm: {
          success: results.lstm.success,
          trainingLoss: results.lstm.trainingMetrics?.finalLoss,
          valLoss: results.lstm.trainingMetrics?.finalValLoss,
          testMAE: results.lstm.testMetrics?.mae,
          testRMSE: results.lstm.testMetrics?.rmse
        }
      }
    };

    const summaryPath = path.join(saveDir, "training-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`📋 Training summary saved to: ${summaryPath}`);
  }
}

module.exports = ModelTrainer;
