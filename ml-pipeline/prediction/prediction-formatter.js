// ============================================================================
// 🎯 Prediction Formatter (Phase 2 - Step 9.3)
// Role: Format ensemble output into clean structured JSON
// ============================================================================

class PredictionFormatter {
  constructor() {}

  /**
   * Format raw ensemble output into final JSON structure
   * @param {Object} input
   * @param {string} input.pair - Trading pair e.g. "EURUSD"
   * @param {Object} input.ensemble - Ensemble raw result { signal, confidence, breakdown }
   * @param {Object} input.models - Individual model predictions
   * @param {Object} [input.tradingParams] - Optional trading parameters (entry, TP, SL, etc.)
   * @returns {Object} formatted prediction
   */
  format({ pair, ensemble, models, tradingParams }) {
    const timestamp = new Date().toISOString();

    return {
      pair,
      timestamp,

      // ✅ Ensemble decision
      signal: ensemble.signal || "NO_SIGNAL",
      confidence: Number(ensemble.confidence?.toFixed(2)) || 0.0,

      // ✅ Individual model outputs
      models: {
        lstm: models?.lstm || null,
        randomForest: models?.randomForest || null,
        volatility: models?.volatility || null,
        regime: models?.regime || null,
      },

      // ✅ Ensemble reasoning (why this signal)
      agreement: {
        modelsAgree: ensemble?.breakdown?.agreement?.modelsAgree || 0,
        conflictResolution: ensemble?.breakdown?.agreement?.strategy || "N/A",
        dissenting: ensemble?.breakdown?.agreement?.dissenting || [],
      },

      // ✅ Trading parameters
      tradingParams: tradingParams || {
        entryPrice: models?.lstm?.predictedPrices?.[0] || null,
        targetPrice: models?.lstm?.predictedPrices?.slice(-1)[0] || null,
        stopLoss: null, // to be filled later (risk manager / backtester)
        riskReward: null,
        positionSize: 1.0,
      },
    };
  }
}

module.exports = PredictionFormatter;
