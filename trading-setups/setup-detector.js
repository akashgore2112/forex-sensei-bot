// trading-setups/setup-detector.js
const TrendPullbackSetup = require('./trend-pullback');
const BreakoutVolumeSetup = require('./breakout-volume');

class SetupDetector {
  constructor() {
    this.setups = [
      new TrendPullbackSetup(),
      new BreakoutVolumeSetup()
      // Add reversal setup later if needed
    ];
  }

  detectAll(candles, indicators, mtfa) {
    const detectedSetups = [];

    for (const setup of this.setups) {
      const result = setup.detect(candles, indicators, mtfa);
      if (result) {
        detectedSetups.push(result);
      }
    }

    // If multiple setups detected, pick highest confidence
    if (detectedSetups.length === 0) return null;
    
    return detectedSetups.sort((a, b) => b.confidence - a.confidence)[0];
  }
}

module.exports = SetupDetector;
