// ml-pipeline/training/model-evaluator.js
class ModelEvaluator {
  constructor() {}

  evaluateClassification(yTrue, yPred, labels = ["BUY", "SELL", "HOLD"]) {
    // Validation
    if (!yTrue || !yPred || yTrue.length !== yPred.length) {
      throw new Error("❌ yTrue and yPred length mismatch");
    }
    if (yTrue.length === 0) {
      throw new Error("❌ Cannot evaluate empty arrays");
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

    // Calculate macro-averaged F1
    const f1Values = Object.values(f1Score);
    const macroF1 = f1Values.reduce((a, b) => a + b, 0) / f1Values.length;

    return {
      type: "classification",
      accuracy: Number(accuracy.toFixed(4)),
      macroF1: Number(macroF1.toFixed(4)),
      precision: this._formatMetrics(precision),
      recall: this._formatMetrics(recall),
      f1Score: this._formatMetrics(f1Score),
      confusionMatrix,
    };
  }

  evaluateRegression(yTrue, yPred) {
    if (!yTrue || !yPred || yTrue.length !== yPred.length) {
      throw new Error("❌ yTrue and yPred length mismatch");
    }
    if (yTrue.length === 0) {
      throw new Error("❌ Cannot evaluate empty arrays");
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
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      type: "regression",
      mae: Number(mae.toFixed(6)),
      rmse: Number(rmse.toFixed(6)),
      mape: Number((mape * 100).toFixed(2)), // Convert to percentage
      r2: Number(r2.toFixed(4)),
    };
  }

  _formatMetrics(metricsObj) {
    const formatted = {};
    for (const [key, value] of Object.entries(metricsObj)) {
      formatted[key] = Number(value.toFixed(4));
    }
    return formatted;
  }
}

module.exports = ModelEvaluator;
