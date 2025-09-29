// ============================================================================
// 📊 Statistical Volatility Predictor (Industry Standard Methods)
// Phase 2 - Step 1.3
// Goal: Predict next 5-day volatility using proven statistical methods
// ============================================================================

const fs = require("fs");

class VolatilityPredictor {
  constructor() {
    this.lookback = 60; // 60 days for calculations
    this.ewmaAlpha = 0.94; // Standard for daily forex data
  }

  // ==========================================================================
  // 📌 Core Statistical Methods
  // ==========================================================================

  /**
   * Calculate returns from price data
   */
  calculateReturns(data) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i].close > 0 && data[i - 1].close > 0) {
        returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
      }
    }
    return returns;
  }

  /**
   * Historical Volatility (Standard Deviation of Returns)
   */
  calculateHistoricalVolatility(returns, period = 20) {
    if (returns.length < period) return 0;

    const recentReturns = returns.slice(-period);
    const mean = recentReturns.reduce((sum, r) => sum + r, 0) / period;
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / period;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  /**
   * EWMA Volatility (Exponential Weighted Moving Average)
   * Industry standard: Recent data weighted more heavily
   */
  calculateEWMAVolatility(returns) {
    if (returns.length === 0) return 0;

    let ewmaVar = Math.pow(returns[0], 2); // Initialize with first squared return

    for (let i = 1; i < returns.length; i++) {
      ewmaVar = this.ewmaAlpha * ewmaVar + (1 - this.ewmaAlpha) * Math.pow(returns[i], 2);
    }

    return Math.sqrt(ewmaVar) * Math.sqrt(252); // Annualized
  }

  /**
   * ATR Trend Analysis
   * Determine if volatility is increasing or decreasing
   */
  analyzeATRTrend(data, period = 20) {
    const atrValues = data.slice(-period).map(d => d.atr).filter(v => v > 0);
    
    if (atrValues.length < 10) {
      return { trend: "STABLE", momentum: 0 };
    }

    // Linear regression on ATR values
    const n = atrValues.length;
    const xMean = (n - 1) / 2;
    const yMean = atrValues.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (atrValues[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = numerator / denominator;
    const percentChange = (slope / yMean) * 100;

    let trend = "STABLE";
    if (percentChange > 2) trend = "INCREASING";
    else if (percentChange < -2) trend = "DECREASING";

    return {
      trend,
      momentum: percentChange,
      recentAvg: yMean
    };
  }

  /**
   * Market Regime Classification
   */
  classifyMarketRegime(currentVol, historicalVols) {
    if (historicalVols.length < 20) return "UNKNOWN";

    // Calculate percentile of current volatility
    const sorted = [...historicalVols].sort((a, b) => a - b);
    const position = sorted.filter(v => v <= currentVol).length;
    const percentile = (position / sorted.length) * 100;

    if (percentile < 30) return "CALM";
    if (percentile < 70) return "NORMAL";
    return "VOLATILE";
  }

  // ==========================================================================
  // 📌 Main Prediction Method
  // ==========================================================================

  /**
   * Predict future volatility using statistical ensemble
   * @param {Array} data - Historical candle data with ATR
   * @returns {Object} Volatility forecast
   */
  predict(data) {
    if (!Array.isArray(data) || data.length < 60) {
      throw new Error(`Need at least 60 candles for prediction, got ${data?.length || 0}`);
    }

    // Use last 60 days
    const recentData = data.slice(-this.lookback);
    
    // Validate data has required fields
    const validData = recentData.filter(d => 
      d.close > 0 && d.high > 0 && d.low > 0 && d.atr > 0
    );

    if (validData.length < 40) {
      throw new Error("Insufficient valid data for prediction");
    }

    // 1. Calculate returns-based volatility
    const returns = this.calculateReturns(validData);
    const historicalVol = this.calculateHistoricalVolatility(returns, 20);
    const ewmaVol = this.calculateEWMAVolatility(returns);

    // 2. ATR-based analysis
    const currentATR = validData[validData.length - 1].atr;
    const atrTrend = this.analyzeATRTrend(validData, 20);

    // 3. Calculate ATR percentile (historical context)
    const historicalATRs = validData.map(d => d.atr);
    const atrPercentile = this.calculatePercentile(currentATR, historicalATRs);

    // 4. Forecast next 5-day ATR using exponential smoothing
    let predictedATR = currentATR;
    
    // Apply trend adjustment
    if (atrTrend.trend === "INCREASING") {
      predictedATR = currentATR * 1.05; // 5% increase expected
    } else if (atrTrend.trend === "DECREASING") {
      predictedATR = currentATR * 0.95; // 5% decrease expected
    }

    // Apply mean reversion (volatility tends to revert to mean)
    const avgATR = atrTrend.recentAvg;
    predictedATR = 0.7 * predictedATR + 0.3 * avgATR; // Blend with mean

    // 5. Calculate confidence based on trend consistency
    const confidence = this.calculateConfidence(atrTrend, atrPercentile);

    // 6. Determine market regime
    const regime = this.classifyMarketRegime(currentATR, historicalATRs);

    // 7. Calculate metrics
    const currentClose = validData[validData.length - 1].close;
    const percentChange = ((predictedATR - currentATR) / currentATR) * 100;
    const volatilityLevel = this.categorizeVolatility(predictedATR, currentClose);
    const riskAdjustment = this.calculateRiskAdjustment(predictedATR, currentClose);

    return {
      predictedVolatility: Number(predictedATR.toFixed(6)),
      currentVolatility: Number(currentATR.toFixed(6)),
      volatilityLevel,
      percentChange: Number(percentChange.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      riskAdjustment: Number(riskAdjustment.toFixed(2)),
      recommendation: this.getRecommendation(predictedATR, currentATR, regime),
      details: {
        trend: atrTrend.trend,
        momentum: Number(atrTrend.momentum.toFixed(2)),
        regime,
        atrPercentile: Number(atrPercentile.toFixed(1)),
        historicalVol: Number(historicalVol.toFixed(4)),
        ewmaVol: Number(ewmaVol.toFixed(4))
      }
    };
  }

  // ==========================================================================
  // 📌 Helper Methods
  // ==========================================================================

  calculatePercentile(value, array) {
    const sorted = [...array].sort((a, b) => a - b);
    const position = sorted.filter(v => v <= value).length;
    return (position / sorted.length) * 100;
  }

  calculateConfidence(atrTrend, percentile) {
    let confidence = 0.7; // Base confidence

    // Higher confidence if trend is clear
    if (Math.abs(atrTrend.momentum) > 5) confidence += 0.1;
    if (Math.abs(atrTrend.momentum) > 10) confidence += 0.1;

    // Lower confidence in extreme percentiles (mean reversion likely)
    if (percentile > 90 || percentile < 10) confidence -= 0.15;

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  categorizeVolatility(predictedATR, currentClose) {
    const ratio = predictedATR / currentClose;

    if (ratio < 0.005) return "LOW";      // < 0.5%
    if (ratio < 0.01) return "MEDIUM";    // 0.5% - 1.0%
    return "HIGH";                         // > 1.0%
  }

  calculateRiskAdjustment(predictedATR, currentClose) {
    const ratio = predictedATR / currentClose;

    if (ratio < 0.003) return 2.0;   // Very low volatility → increase position
    if (ratio < 0.006) return 1.5;   // Low volatility → increase moderately
    if (ratio < 0.01) return 1.0;    // Normal volatility → standard position
    if (ratio < 0.015) return 0.7;   // High volatility → reduce position
    return 0.5;                       // Very high volatility → reduce significantly
  }

  getRecommendation(predictedATR, currentATR, regime) {
    const increase = (predictedATR / currentATR) - 1;

    if (regime === "VOLATILE" || increase > 0.2) {
      return "REDUCE_POSITION";
    } else if (regime === "CALM" && increase < -0.1) {
      return "INCREASE_POSITION";
    }
    return "NORMAL_POSITION";
  }

  // ==========================================================================
  // 📌 No Training/Saving Needed (Statistical Model)
  // ==========================================================================

  /**
   * Statistical models don't need training
   * These methods are here for API compatibility
   */
  async trainModel(historicalData) {
    console.log("Statistical model doesn't require training.");
    console.log("Volatility is calculated in real-time from data.");
    return {
      message: "No training needed for statistical model",
      ready: true
    };
  }

  async saveModel(filepath) {
    console.log("Statistical model has no weights to save.");
    console.log("Configuration can be adjusted in constructor.");
    return true;
  }

  async loadModel(filepath) {
    console.log("Statistical model doesn't need loading.");
    console.log("Ready to predict immediately.");
    return true;
  }
}

module.exports = VolatilityPredictor;
