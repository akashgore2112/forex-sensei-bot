// ============================================================================
// 📊 Model Evaluator (Phase 2 - Step 8.3)
// Role: Centralized evaluation of classification + regression models
// Author: Forex ML Pipeline
// ============================================================================

class ModelEvaluator {
  constructor() {}

  // ==========================================================================
  // 📊 Classification Metrics
  // ==========================================================================
  evaluateClassification(yTrue, yPred, labels = ["BUY", "SELL", "HOLD"]) {
    if (!yTrue || !yPred || yTrue.length !== yPred.length) {
      throw new Error("❌ Classification evaluation failed: yTrue and yPred length mismatch");
    }

    const confusionMatrix = {};
    labels.forEach(label => {
      confusionMatrix[label] = {};
      labels.forEach(l => (confusionMatrix[label][l] = 0));
    });

    let correct = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const actual = yTrue[i];
      const predicted = yPred[i];
      if (actual === predicted) correct++;
      if (confusionMatrix[actual] && confusionMatrix[actual][predicted] !== undefined) {
        confusionMatrix[actual][predicted]++;
      }
    }

    const accuracy = correct / yTrue.length;
    const precision = {};
    const recall = {};
    const f1Score = {};

    labels.forEach(label => {
      const tp = confusionMatrix[label][label];
      const fp = labels.reduce((sum, l) => (l !== label ? sum + confusionMatrix[l][label] : sum), 0);
      const fn = labels.reduce((sum, l) => (l !== label ? sum + confusionMatrix[label][l] : sum), 0);

      precision[label] = tp + fp > 0 ? tp / (tp + fp) : 0;
      recall[label] = tp + fn > 0 ? tp / (tp + fn) : 0;
      f1Score[label] =
        precision[label] + recall[label] > 0
          ? 2 * (precision[label] * recall[label]) / (precision[label] + recall[label])
          : 0;
    });

    return {
      type: "classification",
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix,
    };
  }

  // ==========================================================================
  // 📉 Regression Metrics
  // ==========================================================================
  evaluateRegression(yTrue, yPred) {
    if (!yTrue || !yPred || yTrue.length !== yPred.length) {
      throw new Error("❌ Regression evaluation failed: yTrue and yPred length mismatch");
    }

    const n = yTrue.length;
    const residuals = yTrue.map((y, i) => y - yPred[i]);
    const mae = residuals.reduce((a, b) => a + Math.abs(b), 0) / n;
    const rmse = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / n);
    const mape =
      yTrue.reduce((a, y, i) => a + Math.abs((y - yPred[i]) / (y || 1)), 0) / n;

    const meanY = yTrue.reduce((a, b) => a + b, 0) / n;
    const ssRes = residuals.reduce((a, b) => a + b * b, 0);
    const ssTot = yTrue.reduce((a, y) => a + Math.pow(y - meanY, 2), 0);
    const r2 = 1 - ssRes / ssTot;

    return {
      type: "regression",
      mae,
      rmse,
      mape,
      r2,
    };
  }
}

module.exports = ModelEvaluator;
