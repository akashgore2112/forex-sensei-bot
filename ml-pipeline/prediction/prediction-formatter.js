// ml-pipeline/prediction/prediction-formatter.js
// ============================================================================
// 🎯 Prediction Formatter (Phase 2 - Step 9.3)
// Role: Convert ensemble + model predictions into final structured JSON
// ============================================================================

class PredictionFormatter {
  format({ pair, ensemble, models, tradingParams }) {
    // ✅ Input validation (required fields)
    if (!pair || !ensemble) {
      throw new Error(
        "PredictionFormatter: Missing required fields 'pair' or 'ensemble'"
      );
    }

    const timestamp = new Date().toISOString();

    // ✅ Build trading parameters (fallback if not provided)
    const entryPrice =
      tradingParams?.entryPrice ||
      models?.lstm?.predictedPrices?.[0] ||
      null;

    const targetPrice =
      tradingParams?.targetPrice ||
      (models?.lstm?.predictedPrices?.length
        ? models.lstm.predictedPrices.slice(-1)[0]
        : null);

    const stopLoss = tradingParams?.stopLoss || (entryPrice ? entryPrice * 0.99 : null);

    const riskReward = tradingParams?.riskReward || 2.0;
    const positionSize = tradingParams?.positionSize || 1.0;

    return {
      pair,
      timestamp,

      // ✅ Ensemble decision
      signal: ensemble.signal || "NO_SIGNAL",
      confidence: Number(ensemble.confidence?.toFixed(2)) || 0,

      // ✅ Individual model outputs
      models: {
        lstm: models?.lstm || null,
        randomForest: models?.randomForest || null,
        volatility: models?.volatility || null,
        regime: models?.regime || null,
      },

      // ✅ Ensemble reasoning
      agreement: {
        modelsAgree: ensemble.breakdown?.modelsAgree || 0,
        conflictResolution: ensemble.breakdown?.strategy || "UNKNOWN",
        dissenting: ensemble.breakdown?.dissenting || [],
      },

      // ✅ Trading parameters (risk management ready)
      tradingParams: {
        entryPrice,
        targetPrice,
        stopLoss,
        riskReward,
        positionSize,
      },
    };
  }
}

module.exports = PredictionFormatter;
