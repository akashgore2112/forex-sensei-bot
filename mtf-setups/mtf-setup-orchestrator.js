// mtf-setups/mtf-setup-orchestrator.js  
const DailyBiasFilter = require('./daily-bias-filter');  
const FourHourSetupScanner = require('./4h-setup-scanner');  
const OneHourEntryScanner = require('./1h-entry-scanner');  
  
class MTFSetupOrchestrator {  
  constructor() {  
    this.dailyBiasFilter = new DailyBiasFilter();  
    this.fourHScanner = new FourHourSetupScanner();  
    this.oneHScanner = new OneHourEntryScanner();  
      
    this.activeSetup = null; // Stores active 4H setup waiting for 1H entry  
  }  
  
  /**  
   * Main scan method - coordinates all 3 timeframes  
   * @param {Object} data - Contains daily, fourH, oneH candles  
   * @param {Object} indicators - Contains indicators for all timeframes  
   * @returns {Object} Complete scan result  
   */  
  scanForSetup(data, indicators) {  
    const { daily, fourH, oneH } = data;  
    const { dailyIndicators, fourHIndicators, oneHIndicators } = indicators;  
  
    // Stage 1: Check daily bias  
    const dailyBias = this.dailyBiasFilter.getBias(daily, dailyIndicators);  
  
    if (!dailyBias.valid) {  
      this.invalidateSetup("Daily bias NEUTRAL");  
      return this.buildResult("DAILY_BIAS", dailyBias, null, null, false);  
    }  
  
    // Stage 2: Check for 4H setup (or use existing active setup)  
    let setup4H = this.activeSetup;  
  
    // Check if active setup still valid (daily bias hasn't changed)  
    if (this.activeSetup && this.activeSetup.dailyBias !== dailyBias.bias) {  
      this.invalidateSetup(`Daily bias changed from ${this.activeSetup.dailyBias} to ${dailyBias.bias}`);  
      setup4H = null;  
    }  
  
    // Scan for new 4H setup if none active  
    if (!setup4H) {  
      setup4H = this.fourHScanner.scanForSetup(fourH, fourHIndicators, dailyBias);  
        
      if (setup4H.detected) {  
        this.activeSetup = setup4H;  
      } else {  
        return this.buildResult("4H_SETUP", dailyBias, setup4H, null, false);  
      }  
    }  
  
    // Stage 3: Check for 1H entry  
    const entry1H = this.oneHScanner.scanForEntry(oneH, oneHIndicators, setup4H);  
  
    if (entry1H.entryReady) {  
      // Entry signal complete - clear active setup  
      this.activeSetup = null;  
      return this.buildResult("1H_ENTRY", dailyBias, setup4H, entry1H, true);  
    } else {  
      // Still waiting for 1H entry  
      return this.buildResult("1H_ENTRY", dailyBias, setup4H, entry1H, false);  
    }  
  }  
  
  buildResult(stage, dailyBias, setup4H, entry1H, ready) {  
    let reason;  
      
    if (stage === "DAILY_BIAS") {  
      reason = dailyBias.reason;  
    } else if (stage === "4H_SETUP") {  
      reason = `Daily bias: ${dailyBias.bias}. ${setup4H.reason}`;  
    } else if (stage === "1H_ENTRY") {  
      if (ready) {  
        reason = `Complete trade signal. ${entry1H.reason}`;  
      } else {  
        reason = `4H setup active, waiting for 1H entry. ${entry1H.reason}`;  
      }  
    }  
  
    return {  
      stage: stage,  
      dailyBias: dailyBias,  
      setup4H: setup4H,  
      entry1H: entry1H,  
      ready: ready,  
      reason: reason  
    };  
  }  
  
  hasActiveSetup() {  
    return this.activeSetup !== null;  
  }  
  
  invalidateSetup(reason) {  
    if (this.activeSetup) {  
      console.log(`[ORCHESTRATOR] Invalidating setup: ${reason}`);  
      this.activeSetup = null;  
    }  
  }  
  
  getActiveSetup() {  
    return this.activeSetup;  
  }  
}  
  
module.exports = MTFSetupOrchestrator;
