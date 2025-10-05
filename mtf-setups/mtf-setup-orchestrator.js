// mtf-setups/mtf-setup-orchestrator.js
const FourHTrendDetector = require('./4h-trend-detector');
const OneHPinBarEntryScanner = require('./1h-pinbar-entry-scanner');

class MTFSetupOrchestrator {
  constructor() {
    this.trendDetector = new FourHTrendDetector();
    this.entryScanner = new OneHPinBarEntryScanner();
    
    this.activeTrend = null; // Track current 4H trend
  }

  /**
   * Simplified scan: 4H trend → 1H pin bar entry
   */
  scanForSetup(data, indicators) {
    const { fourH, oneH } = data;
    const { fourHIndicators, oneHIndicators } = indicators;

    // Stage 1: Check 4H trend
    const trend4H = this.trendDetector.detectTrend(fourH, fourHIndicators);

    // Track trend changes
    if (this.activeTrend && this.activeTrend !== trend4H.trend) {
      console.log(`[4H TREND] ${this.activeTrend} → ${trend4H.trend}`);
    }
    this.activeTrend = trend4H.trend;

    if (!trend4H.detected) {
      return this.buildResult("4H_TREND", trend4H, null, false);
    }

    // Stage 2: Check for 1H pin bar entry
    const entry1H = this.entryScanner.scanForEntry(oneH, oneHIndicators, trend4H);

    if (entry1H.entryReady) {
      return this.buildResult("1H_ENTRY", trend4H, entry1H, true);
    } else {
      return this.buildResult("1H_ENTRY", trend4H, entry1H, false);
    }
  }

  buildResult(stage, trend4H, entry1H, ready) {
    let reason;
    
    if (stage === "4H_TREND") {
      reason = trend4H.reason;
    } else if (stage === "1H_ENTRY") {
      if (ready) {
        reason = `Trade signal ready. ${entry1H.reason}`;
      } else {
        reason = `4H trend: ${trend4H.trend}. ${entry1H.reason}`;
      }
    }

    return {
      stage: stage,
      trend4H: trend4H,
      entry1H: entry1H,
      ready: ready,
      reason: reason
    };
  }

  hasActiveTrend() {
    return this.activeTrend !== null && this.activeTrend !== "NEUTRAL";
  }

  getActiveTrend() {
    return this.activeTrend;
  }
}

module.exports = MTFSetupOrchestrator;
