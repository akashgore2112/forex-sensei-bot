// ml-pipeline/prediction/prediction-formatter.js
class PredictionFormatter {
  format({ pair, ensemble }) {
    if (!pair || !ensemble) {
      throw new Error("Missing required fields: pair or ensemble");
    }

    const timestamp = new Date().toISOString();
    const models = ensemble.models || {};

    const entryPrice = models.lstm?.currentPrice || null;
    const targetPrice = models.lstm?.predictedPrices?.[models.lstm.predictedPrices.length - 1] || null;
    const stopLoss = entryPrice ? Number((entryPrice * 0.985).toFixed(5)) : null;
    const riskReward = 2.5;
    const positionSize = models.volatility?.riskAdjustment || 1.0;

    return {
      pair,
      timestamp,

      signal: ensemble.signal || "NO_SIGNAL",
      confidence: ensemble.confidence || 0,

      models: {
        lstm: models.lstm || null,
        randomForest: models.randomForest || null,
        volatility: models.volatility || null,
        regime: models.regime || null
      },

      agreement: {
        modelsAgree: ensemble.agreement?.modelsAgree || 0,
        totalModels: ensemble.agreement?.totalModels || 4,
        confidenceBreakdown: ensemble.confidenceBreakdown || null
      },

      tradingParams: {
        entryPrice,
        targetPrice,
        stopLoss,
        riskReward,
        positionSize: Number(positionSize.toFixed(2))
      },

      scores: ensemble.scores || {}
    };
  }
}

module.exports = PredictionFormatter;
