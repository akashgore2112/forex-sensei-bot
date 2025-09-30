// ============================================================================
// 📊 Market Regime Classifier (Production-Ready)
// Phase 2 - Step 1.4
// Industry standard approach using ADX, BB, price action, volume
// ============================================================================

class MarketRegimeClassifier {
  constructor() {
    this.lookback = 50; // For calculating averages
  }

  /**
   * Classify current market regime
   * @param {Array} candles - Historical candle data
   * @param {Object} indicators - Calculated indicators from Phase 1
   * @returns {Object} Regime classification with confidence and recommendations
   */
  classifyRegime(candles, indicators) {
    // Validation
    this.validateInputs(candles, indicators);

    const totalCandles = candles.length;
    const latest = this.extractLatestValues(candles, indicators);
    
    // Calculate derived metrics
    const derived = this.calculateDerivedMetrics(candles, indicators, latest);
    
    // Run classification logic
    const classification = this.determineRegime(latest, derived);
    
    // Calculate dynamic confidence
    const confidence = this.calculateConfidence(latest, derived, classification.regime);
    
    // Get strategy recommendation
    const strategy = this.getStrategyRecommendation(classification.regime, classification.subtype);
    
    return {
      regime: classification.regime,
      subtype: classification.subtype,
      confidence: Number(confidence.toFixed(2)),
      
      characteristics: {
        trendStrength: this.categorizeTrendStrength(latest.adx),
        volatility: this.categorizeVolatility(derived.atrRatio),
        momentum: this.categorizeMomentum(latest),
        rangeQuality: this.categorizeRange(derived.bbWidth, latest.close)
      },
      
      strategyRecommendation: strategy.action,
      riskLevel: strategy.risk,
      
      metrics: {
        adx: Number(latest.adx.toFixed(2)),
        atr: Number(latest.atr.toFixed(6)),
        bbWidthPercentile: Number((derived.bbWidth / latest.close * 100).toFixed(2)),
        priceVsEMA: this.getPricePosition(latest),
        volumeTrend: derived.volumeTrend,
        emaAlignment: derived.emaAlignment
      }
    };
  }

  // ==========================================================================
  // Validation
  // ==========================================================================
  validateInputs(candles, indicators) {
    if (!candles || candles.length < 100) {
      throw new Error(`Need at least 100 candles, got ${candles?.length || 0}`);
    }

    const required = ['adx', 'atr', 'ema20', 'ema50', 'ema200', 'bollinger'];
    const missing = required.filter(ind => !indicators[ind]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required indicators: ${missing.join(', ')}`);
    }

    if (!indicators.bollinger.upper || !indicators.bollinger.lower) {
      throw new Error('Bollinger Bands missing upper/lower values');
    }
  }

  // ==========================================================================
  // Data Extraction
  // ==========================================================================
  extractLatestValues(candles, indicators) {
    const lastIndex = candles.length - 1;
    
    return {
      close: candles[lastIndex].close,
      volume: candles[lastIndex].volume || 0,
      
      adx: this.safeLast(indicators.adx),
      atr: this.safeLast(indicators.atr),
      
      ema20: this.safeLast(indicators.ema20),
      ema50: this.safeLast(indicators.ema50),
      ema200: this.safeLast(indicators.ema200),
      
      bbUpper: this.safeLast(indicators.bollinger.upper),
      bbMiddle: this.safeLast(indicators.bollinger.middle),
      bbLower: this.safeLast(indicators.bollinger.lower)
    };
  }

  calculateDerivedMetrics(candles, indicators, latest) {
    // ATR ratio (current vs average)
    const atrArray = indicators.atr.slice(-this.lookback);
    const atrMean = this.safeMean(atrArray);
    const atrRatio = atrMean > 0 ? latest.atr / atrMean : 1;

    // Bollinger Band width
    const bbWidth = latest.bbUpper - latest.bbLower;
    const bbWidthArray = [];
    for (let i = Math.max(0, candles.length - this.lookback); i < candles.length; i++) {
      const upper = indicators.bollinger.upper[i];
      const lower = indicators.bollinger.lower[i];
      if (upper && lower) bbWidthArray.push(upper - lower);
    }
    const avgBBWidth = this.safeMean(bbWidthArray);
    const bbWidthRatio = avgBBWidth > 0 ? bbWidth / avgBBWidth : 1;

    // Volume analysis
    const recentVolume = this.safeMean(
      candles.slice(-5).map(c => c.volume || 0)
    );
    const avgVolume = this.safeMean(
      candles.slice(-this.lookback).map(c => c.volume || 0)
    );
    const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 1;
    const volumeTrend = volumeRatio > 1.2 ? "INCREASING" : volumeRatio < 0.8 ? "DECREASING" : "STABLE";

    // EMA alignment
    const emaAlignment = this.analyzeEMAAlignment(latest);

    // Price distance from BB middle
    const priceVsBBMiddle = latest.bbMiddle > 0 
      ? (latest.close - latest.bbMiddle) / latest.bbMiddle 
      : 0;

    return {
      atrRatio,
      bbWidth,
      bbWidthRatio,
      avgBBWidth,
      volumeRatio,
      volumeTrend,
      emaAlignment,
      priceVsBBMiddle
    };
  }

  // ==========================================================================
  // Classification Logic
  // ==========================================================================
  determineRegime(latest, derived) {
    // Priority 1: High volatility / chaotic conditions
    if (derived.atrRatio > 1.5) {
      return {
        regime: "VOLATILE",
        subtype: derived.atrRatio > 2.0 ? "EXTREME_VOLATILITY" : "HIGH_VOLATILITY"
      };
    }

    // Priority 2: Strong trending conditions
    if (latest.adx > 25) {
      if (derived.emaAlignment === "BULLISH_ALIGNED") {
        return {
          regime: "TRENDING",
          subtype: latest.adx > 35 ? "STRONG_UPTREND" : "UPTREND"
        };
      } else if (derived.emaAlignment === "BEARISH_ALIGNED") {
        return {
          regime: "TRENDING",
          subtype: latest.adx > 35 ? "STRONG_DOWNTREND" : "DOWNTREND"
        };
      }
    }

    // Priority 3: Breakout conditions
    const breakoutConfirmed = derived.volumeRatio > 1.3;
    
    if (latest.close > latest.bbUpper && breakoutConfirmed) {
      return {
        regime: "BREAKOUT",
        subtype: latest.adx > 20 ? "BULLISH_BREAKOUT" : "FALSE_BREAKOUT_RISK"
      };
    }
    
    if (latest.close < latest.bbLower && breakoutConfirmed) {
      return {
        regime: "BREAKOUT",
        subtype: latest.adx > 20 ? "BEARISH_BREAKOUT" : "FALSE_BREAKOUT_RISK"
      };
    }

    // Priority 4: Ranging / consolidation
    if (latest.adx < 20 && derived.bbWidthRatio < 0.8) {
      return {
        regime: "RANGING",
        subtype: derived.bbWidthRatio < 0.6 ? "TIGHT_CONSOLIDATION" : "NORMAL_RANGE"
      };
    }

    // Default: Transitional / unclear
    return {
      regime: "TRANSITIONAL",
      subtype: "UNCLEAR_DIRECTION"
    };
  }

  // ==========================================================================
  // Confidence Calculation
  // ==========================================================================
  calculateConfidence(latest, derived, regime) {
    let confidence = 0.5; // Base confidence

    switch (regime) {
      case "TRENDING":
        // Higher ADX = more confidence
        confidence = 0.6 + Math.min(0.3, (latest.adx - 25) / 50);
        
        // Strong EMA alignment adds confidence
        if (derived.emaAlignment.includes("ALIGNED")) confidence += 0.1;
        
        // Volume confirmation
        if (derived.volumeRatio > 1.2) confidence += 0.05;
        break;

      case "RANGING":
        // Tight BB + low ADX = high confidence
        confidence = 0.6;
        if (latest.adx < 15) confidence += 0.1;
        if (derived.bbWidthRatio < 0.6) confidence += 0.1;
        break;

      case "BREAKOUT":
        // Volume + ADX rising = high confidence
        confidence = 0.65;
        if (derived.volumeRatio > 1.5) confidence += 0.15;
        if (latest.adx > 25) confidence += 0.1;
        break;

      case "VOLATILE":
        // ATR spike is clear signal
        confidence = 0.7 + Math.min(0.2, derived.atrRatio - 1.5);
        break;

      default:
        confidence = 0.4; // Low confidence for unclear regimes
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  // ==========================================================================
  // Strategy Recommendations
  // ==========================================================================
  getStrategyRecommendation(regime, subtype) {
    const strategies = {
      TRENDING: {
        STRONG_UPTREND: { action: "FOLLOW_TREND", risk: "MEDIUM" },
        UPTREND: { action: "FOLLOW_TREND", risk: "MEDIUM" },
        STRONG_DOWNTREND: { action: "FOLLOW_TREND", risk: "MEDIUM" },
        DOWNTREND: { action: "FOLLOW_TREND", risk: "MEDIUM" }
      },
      RANGING: {
        TIGHT_CONSOLIDATION: { action: "MEAN_REVERSION", risk: "LOW" },
        NORMAL_RANGE: { action: "MEAN_REVERSION", risk: "LOW" }
      },
      BREAKOUT: {
        BULLISH_BREAKOUT: { action: "MOMENTUM_PLAY", risk: "HIGH" },
        BEARISH_BREAKOUT: { action: "MOMENTUM_PLAY", risk: "HIGH" },
        FALSE_BREAKOUT_RISK: { action: "WAIT_CONFIRMATION", risk: "HIGH" }
      },
      VOLATILE: {
        EXTREME_VOLATILITY: { action: "AVOID_TRADING", risk: "VERY_HIGH" },
        HIGH_VOLATILITY: { action: "REDUCE_POSITION", risk: "HIGH" }
      },
      TRANSITIONAL: {
        UNCLEAR_DIRECTION: { action: "WAIT_CLARITY", risk: "MEDIUM" }
      }
    };

    return strategies[regime]?.[subtype] || { action: "WAIT", risk: "UNKNOWN" };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================
  analyzeEMAAlignment(latest) {
    const bullishAligned = 
      latest.ema20 > latest.ema50 && 
      latest.ema50 > latest.ema200;
    
    const bearishAligned = 
      latest.ema20 < latest.ema50 && 
      latest.ema50 < latest.ema200;

    if (bullishAligned) return "BULLISH_ALIGNED";
    if (bearishAligned) return "BEARISH_ALIGNED";
    return "MIXED";
  }

  categorizeTrendStrength(adx) {
    if (adx > 40) return "VERY_STRONG";
    if (adx > 30) return "STRONG";
    if (adx > 20) return "MODERATE";
    return "WEAK";
  }

  categorizeVolatility(atrRatio) {
    if (atrRatio > 2.0) return "EXTREME";
    if (atrRatio > 1.5) return "HIGH";
    if (atrRatio > 1.2) return "MEDIUM";
    return "LOW";
  }

  categorizeMomentum(latest) {
    if (latest.close > latest.ema20 && latest.ema20 > latest.ema50) return "STRONG_POSITIVE";
    if (latest.close > latest.ema20) return "POSITIVE";
    if (latest.close < latest.ema20 && latest.ema20 < latest.ema50) return "STRONG_NEGATIVE";
    if (latest.close < latest.ema20) return "NEGATIVE";
    return "NEUTRAL";
  }

  categorizeRange(bbWidth, close) {
    const ratio = bbWidth / close;
    if (ratio > 0.02) return "EXPANDING";
    if (ratio < 0.005) return "CONTRACTING";
    return "STABLE";
  }

  getPricePosition(latest) {
    if (latest.close > latest.ema20) return "ABOVE_EMA20";
    if (latest.close < latest.ema20) return "BELOW_EMA20";
    return "AT_EMA20";
  }

  safeLast(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const val = arr[arr.length - 1];
    return (val != null && Number.isFinite(val)) ? val : 0;
  }

  safeMean(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const validValues = arr.filter(v => v != null && Number.isFinite(v));
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  }
}

module.exports = MarketRegimeClassifier;
