// test/test-rfc.js
// 📊 Random Forest Classifier Test with MTFA Data + Load-or-Train

const SwingSignalClassifier = require("../ml-pipeline/models/random-forest-classifier");
const MTFA = require("../mtfa");
const SwingIndicators = require("../swing-indicators");
const fs = require("fs");
const path = require("path");

// ✅ CLI flag check
const args = process.argv.slice(2);
const forceRetrain = args.includes("--force-train");

// ✅ Helper: Extract indicator value from Phase 1 format
function extractIndicatorValue(indicator, index) {
  if (!indicator) return 0;
  if (Array.isArray(indicator)) {
    const item = indicator[index];
    if (typeof item === 'object' && item !== null) {
      return item.value || 0;
    }
    return item || 0;
  }
  return indicator;
}

// ✅ Helper: Calculate average volume
function calculateAvgVolume(candles, currentIndex) {
  const lookback = Math.min(20, currentIndex);
  if (lookback === 0) return 1000;
  
  const recentVolumes = candles
    .slice(Math.max(0, currentIndex - lookback), currentIndex)
    .map(c => c.volume || 0)
    .filter(v => v > 0);
  
  if (recentVolumes.length === 0) return 1000;
  return recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
}

// ✅ Helper: Process candles with indicators (DRY)
async function processCandles(pair = "EUR/USD") {
  console.log(`📊 Fetching MTFA data for ${pair}...`);
  const mtfaResult = await MTFA.analyze(pair);

  if (!mtfaResult || !mtfaResult.dailyCandles?.length) {
    throw new Error("❌ MTFA did not return daily candles. Check Phase 1 system.");
  }

  const candles = mtfaResult.dailyCandles;
  console.log(`✅ Got ${candles.length} daily candles from MTFA`);

  // Recalculate indicators
  console.log("📈 Calculating indicators on MTFA candles...");
  const indicators = await SwingIndicators.calculateAll(candles);

  // ✅ Debug: Show indicator structure
  console.log("🔍 Indicator structure check:");
  console.log(`   EMA20 format: ${Array.isArray(indicators.ema20) ? 'Array' : typeof indicators.ema20}`);
  if (Array.isArray(indicators.ema20) && indicators.ema20.length > 0) {
    console.log(`   EMA20[0]: ${JSON.stringify(indicators.ema20[0])}`);
  }
  console.log(`   MACD format: ${typeof indicators.macd}`);
  if (indicators.macd) {
    console.log(`   MACD keys: ${Object.keys(indicators.macd).join(', ')}`);
  }

  // ✅ Process and merge data
  console.log("🔄 Merging candles with indicators...");
  const processed = candles.map((c, i) => {
    // Extract indicator values properly
    const ema20Val = extractIndicatorValue(indicators.ema20, i);
    const ema50Val = extractIndicatorValue(indicators.ema50, i);
    const rsiVal = extractIndicatorValue(indicators.rsi14, i);
    const atrVal = extractIndicatorValue(indicators.atr, i);

    // Handle MACD structure from Phase 1
    let macdObj = { macd: 0, signal: 0 };
    if (indicators.macd) {
      // Phase 1 format: { line: [...], signal: [...], histogram: [...] }
      macdObj = {
        macd: extractIndicatorValue(indicators.macd.line, i),
        signal: extractIndicatorValue(indicators.macd.signal, i)
      };
    }

    // Calculate average volume
    const avgVol = calculateAvgVolume(candles, i);

    return {
      close: c.close,
      ema20: ema20Val,
      ema50: ema50Val,
      rsi: rsiVal,
      macd: macdObj,
      atr: atrVal,
      volume: c.volume || avgVol,
      avgVolume: avgVol,
      prevClose: i > 0 ? candles[i - 1].close : c.close,
      
      // ✅ Add debug info for first few samples
      _debug: i < 3 ? {
        index: i,
        date: c.date,
        rawEma20: indicators.ema20?.[i],
        rawMACD: indicators.macd ? {
          line: indicators.macd.line?.[i],
          signal: indicators.macd.signal?.[i]
        } : null
      } : undefined
    };
  });

  // ✅ Show sample data for debugging
  if (processed.length > 0) {
    console.log("\n📊 Sample processed data (first 3 items):");
    processed.slice(0, 3).forEach((item, idx) => {
      console.log(`\n   [${idx}] ${item._debug?.date || 'N/A'}:`);
      console.log(`      Close: ${item.close}`);
      console.log(`      EMA20: ${item.ema20}, EMA50: ${item.ema50}`);
      console.log(`      RSI: ${item.rsi}`);
      console.log(`      MACD: ${item.macd.macd}, Signal: ${item.macd.signal}`);
      console.log(`      ATR: ${item.atr}`);
    });
  }

  // Filter valid samples
  console.log("\n🧹 Filtering invalid samples...");
  const validProcessed = processed.filter((d, i) => {
    const values = [
      d.close,
      d.ema20,
      d.ema50,
      d.rsi,
      d.macd?.macd,
      d.macd?.signal,
      d.atr,
      d.volume,
      d.avgVolume,
      d.prevClose,
    ];

    const isValid = values.every(v => v !== undefined && v !== null && !Number.isNaN(v));
    
    if (!isValid && i < 10) {
      console.warn(`⚠️ Skipping invalid sample at index ${i}:`);
      console.warn(`   Values: ${JSON.stringify(values)}`);
    }
    
    return isValid;
  });

  console.log(`📊 Valid samples after filtering: ${validProcessed.length} / ${processed.length}`);

  return { candles, processed: validProcessed };
}

async function runRFCTest() {
  console.log("🚀 Starting Random Forest Classifier Test...");
  console.log(`   Mode: ${forceRetrain ? 'FORCE RETRAIN' : 'LOAD OR TRAIN'}\n`);

  const classifier = new SwingSignalClassifier();
  const modelPath = path.join(__dirname, "../saved-models/rf-model.json");

  let modelLoaded = false;
  let processedData = null;

  // ═══════════════════════════════════════════════════════════════
  // 🔹 STEP 1: Load Model (if exists and not forced to retrain)
  // ═══════════════════════════════════════════════════════════════
  if (!forceRetrain && fs.existsSync(modelPath)) {
    try {
      console.log("📂 Loading pre-trained model...");
      await classifier.loadModel(modelPath);
      console.log("✅ Pre-trained Random Forest model loaded successfully!\n");
      modelLoaded = true;
    } catch (err) {
      console.warn("⚠️ Failed to load saved model, will retrain instead:", err.message);
      modelLoaded = false;
    }
  } else if (forceRetrain) {
    console.log("⚠️ Force retrain requested → skipping model load.\n");
  } else {
    console.log("ℹ️ No saved model found, will train new model.\n");
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔹 STEP 2: Train Model (if not loaded)
  // ═══════════════════════════════════════════════════════════════
  if (!modelLoaded) {
    console.log("═══════════════════════════════════════");
    console.log("         TRAINING NEW MODEL");
    console.log("═══════════════════════════════════════\n");

    // Fetch and process data
    processedData = await processCandles("EUR/USD");

    if (processedData.processed.length < 200) {
      throw new Error(`❌ Not enough valid samples for training. Got ${processedData.processed.length}, need 200+`);
    }

    // Train classifier
    console.log("\n⚡ Training Random Forest Classifier...");
    console.log("──────────────────────────────────────\n");
    
    try {
      const metrics = await classifier.trainModel(processedData.processed);
      
      console.log("\n✅ Random Forest Training Completed!");
      console.log("══════════════════════════════════════════════\n");

      // Show training metrics
      if (metrics) {
        console.log("📊 MODEL PERFORMANCE (Test Set):");
        console.log("──────────────────────────────────────");
        console.log(`   Overall Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
        console.log(`   Average F1-Score: ${(metrics.averageF1 * 100).toFixed(2)}%`);
        console.log(`   Total Test Samples: ${metrics.totalPredictions}`);
        console.log("\n   Per-Class Performance:");
        console.log("   ┌─────────┬───────────┬────────┬─────────┐");
        console.log("   │ Class   │ Precision │ Recall │ F1-Score│");
        console.log("   ├─────────┼───────────┼────────┼─────────┤");
        Object.entries(metrics.classMetrics).forEach(([cls, m]) => {
          const classLabel = cls.padEnd(7);
          const prec = `${(m.precision * 100).toFixed(1)}%`.padEnd(9);
          const rec = `${(m.recall * 100).toFixed(1)}%`.padEnd(6);
          const f1 = `${(m.f1Score * 100).toFixed(1)}%`.padEnd(8);
          console.log(`   │ ${classLabel} │ ${prec} │ ${rec} │ ${f1}│`);
        });
        console.log("   └─────────┴───────────┴────────┴─────────┘\n");

        // Show confusion matrix
        console.log("   Confusion Matrix:");
        console.log("   ┌─────────┬─────┬──────┬──────┐");
        console.log("   │ Actual  │ BUY │ SELL │ HOLD │");
        console.log("   ├─────────┼─────┼──────┼──────┤");
        ['BUY', 'SELL', 'HOLD'].forEach(actual => {
          const buy = String(metrics.confusionMatrix[actual].BUY).padStart(3);
          const sell = String(metrics.confusionMatrix[actual].SELL).padStart(4);
          const hold = String(metrics.confusionMatrix[actual].HOLD).padStart(4);
          console.log(`   │ ${actual.padEnd(7)} │ ${buy} │${sell} │${hold} │`);
        });
        console.log("   └─────────┴─────┴──────┴──────┘\n");
      }

      // Save trained model
      console.log("💾 Saving trained model...");
      await classifier.saveModel(modelPath);
      console.log(`✅ Model saved to: ${modelPath}\n`);

    } catch (err) {
      console.error("❌ Training failed:", err.message);
      console.error(err.stack);
      return;
    }
  } else {
    // Model was loaded, still need latest data for prediction
    processedData = await processCandles("EUR/USD");
  }

// ═══════════════════════════════════════════════════════════════
// 🔹 STEP 3: Make Prediction on Latest Candle
// ═══════════════════════════════════════════════════════════════
console.log("═══════════════════════════════════════");
console.log("        PREDICTION ON LATEST DATA");
console.log("═══════════════════════════════════════\n");

if (!processedData || processedData.processed.length === 0) {
  throw new Error("❌ No processed data available for prediction");
}

const latestData = processedData.processed[processedData.processed.length - 1];

// Convert to feature array
const featureArray = [
  latestData.close,
  latestData.ema20,
  latestData.ema50,
  latestData.rsi,
  latestData.macd?.macd,
  latestData.macd?.signal,
  latestData.atr,
  latestData.volume,
  latestData.avgVolume,
  latestData.prevClose,
];

console.log("🔮 Making classification on latest candle...");
console.log(`   Date: ${processedData.candles[processedData.candles.length - 1].date}`);
console.log(`   Close: ${latestData.close}\n`);

try {
  const prediction = classifier.predict(featureArray);

  console.log("📌 CLASSIFICATION RESULT:");
  console.log("──────────────────────────────────────");
  console.log(`   Signal: ${prediction.signal}`);
  console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(2)}%`);
  console.log("\n   Probabilities:");
  console.log(`   ├─ BUY:  ${(prediction.probabilities.BUY * 100).toFixed(2)}%`);
  console.log(`   ├─ SELL: ${(prediction.probabilities.SELL * 100).toFixed(2)}%`);
  console.log(`   └─ HOLD: ${(prediction.probabilities.HOLD * 100).toFixed(2)}%`);
  console.log("──────────────────────────────────────\n");

  // Additional context
  console.log("📊 Current Market Context:");
  console.log(`   EMA20: ${latestData.ema20.toFixed(5)}, EMA50: ${latestData.ema50.toFixed(5)}`);
  console.log(`   RSI: ${latestData.rsi.toFixed(2)}`);
  console.log(`   MACD: ${latestData.macd.macd.toFixed(5)}, Signal: ${latestData.macd.signal.toFixed(5)}`);
  console.log(`   ATR: ${latestData.atr.toFixed(5)}\n`);

} catch (err) {
  console.error("❌ Prediction failed:", err.message);
  console.error(err.stack);
}
  
// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════
runRFCTest().catch((err) => {
  console.error("\n❌❌❌ FATAL ERROR ❌❌❌");
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
