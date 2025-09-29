// test/test-lstm-real.js
// ✅ FIXED VERSION - Consistent key naming & better error handling

const fs = require("fs");
const path = require("path");
const tf = require("@tensorflow/tfjs-node");

const LSTMPricePredictor = require("../ml-pipeline/models/lstm-predictor");
const DataPreprocessor = require("../ml-pipeline/training/data-preprocessor");
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");

async function runRealLSTMTest() {
  console.log("🚀 Starting LSTM Training/Testing with MTFA Daily Data...\n");

  const modelPath = "file://./saved-models/lstm-price-predictor";
  const predictor = new LSTMPricePredictor();
  const preprocessor = new DataPreprocessor(60, 5);

  try {
    // ========================================
    // 1️⃣ Fetch MTFA Analysis
    // ========================================
    console.log("📊 Running MTFA to fetch candles + indicators...");
    const mtfaResult = await MTFA.analyze("EUR/USD");

    if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
      throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
    }

    const candles = mtfaResult.dailyCandles;
    console.log(`✅ Got ${candles.length} daily candles from MTFA\n`);

    // ========================================
    // 2️⃣ Recalculate Indicators for Consistency
    // ========================================
    console.log("📈 Calculating indicators on MTFA candles...");
    const indicators = await SwingIndicators.calculateAll(candles);

    // ========================================
    // 3️⃣ Merge Candles + Indicators with FIXED KEY NAMES
    // ========================================
    console.log("🔄 Merging candles with indicators...");
    const processed = candles.map((c, i) => {
      // ✅ Handle indicator arrays properly
      const ema20Val = Array.isArray(indicators.ema20) 
        ? indicators.ema20[i]?.value ?? indicators.ema20[i] ?? 0
        : indicators.ema20 ?? 0;
      
      const rsiVal = Array.isArray(indicators.rsi14)
        ? indicators.rsi14[i]?.value ?? indicators.rsi14[i] ?? 0
        : indicators.rsi14 ?? 0;
      
      // ✅ FIXED: Use lowercase 'macd' (swing-indicators returns lowercase)
      const macdVal = indicators.macd && Array.isArray(indicators.macd.macd)
        ? indicators.macd.macd[i]?.value ?? indicators.macd.macd[i] ?? 0
        : indicators.macd?.macd ?? 0;
      
      const atrVal = Array.isArray(indicators.atr)
        ? indicators.atr[i]?.value ?? indicators.atr[i] ?? 0
        : indicators.atr ?? 0;

      return {
        close: c.close,
        ema20: ema20Val,
        rsi: rsiVal,      // ✅ FIXED: consistent key name (not rsi14)
        macd: macdVal,    // ✅ FIXED: Now extracts properly
        atr: atrVal
      };
    });

    // ✅ Filter out invalid data points
    const validProcessed = processed.filter(d => 
      d.close && !isNaN(d.close) &&
      d.ema20 && !isNaN(d.ema20) &&
      d.rsi !== undefined && !isNaN(d.rsi) &&
      d.macd !== undefined && !isNaN(d.macd) &&
      d.atr && !isNaN(d.atr)
    );

    console.log(`✅ Processed ${validProcessed.length} valid candles with indicators\n`);

    if (validProcessed.length < 100) {
      throw new Error(`❌ Not enough valid data: need 100+, got ${validProcessed.length}`);
    }

    // ========================================
    // 4️⃣ Load or Train Model
    // ========================================
    let modelLoaded = false;
    const modelFilePath = path.join("saved-models", "lstm-price-predictor", "model.json");
    
    if (fs.existsSync(modelFilePath)) {
      try {
        await predictor.loadModel(modelPath + "/model.json");
        console.log("✅ Pre-trained LSTM Model Loaded Successfully!\n");
        modelLoaded = true;
      } catch (err) {
        console.warn("⚠️ Failed to load saved model. Will train new model...");
        console.warn(`   Error: ${err.message}\n`);
      }
    } else {
      console.log("📝 No saved model found. Training new model...\n");
    }

    // ========================================
    // 5️⃣ Train Model if Not Loaded
    // ========================================
    if (!modelLoaded) {
      console.log("⚡ Training LSTM on MTFA daily data...");
      console.log(`   Data points: ${validProcessed.length}`);
      console.log(`   Lookback: 60 days`);
      console.log(`   Prediction horizon: 5 days\n`);

      await predictor.trainModel(validProcessed);
      console.log("\n✅ Training Completed!\n");
    }

    // ========================================
    // 6️⃣ Make Prediction on Recent Data
    // ========================================
    console.log("🔮 Making 5-day price prediction...\n");
    const recentData = validProcessed.slice(-60);

    const prediction = await predictor.predict(recentData);

    // ========================================
    // 7️⃣ Format & Display Results
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 LSTM PREDICTION RESULTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n📍 Current Price: ${prediction.currentPrice}`);
    console.log(`\n🎯 Predicted Prices (Next 5 Days):`);
    prediction.predictedPrices.forEach((price, i) => {
      console.log(`   Day ${i + 1}: ${price}`);
    });
    console.log(`\n📈 Direction: ${prediction.direction}`);
    console.log(`📊 Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
    console.log(`💹 Expected Change: ${prediction.percentChange}%`);
    console.log(`📉 Volatility: ${prediction.volatility}`);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // ========================================
    // 8️⃣ Return Formatted Result
    // ========================================
    return {
      success: true,
      pair: "EUR/USD",
      prediction: prediction,
      dataQuality: {
        totalCandles: candles.length,
        validDataPoints: validProcessed.length,
        trainingDataUsed: validProcessed.length - 65
      }
    };

  } catch (err) {
    console.error("\n❌ ERROR in LSTM Test:");
    console.error(`   ${err.message}`);
    console.error("\n" + err.stack);
    return {
      success: false,
      error: err.message
    };
  }
}

// ========================================
// Run Test
// ========================================
if (require.main === module) {
  runRealLSTMTest()
    .then(result => {
      if (result.success) {
        console.log("✅ LSTM Test Completed Successfully!");
      } else {
        console.log("❌ LSTM Test Failed");
        process.exit(1);
      }
    })
    .catch(err => {
      console.error("❌ Fatal error:", err);
      process.exit(1);
    });
}

module.exports = runRealLSTMTest;
