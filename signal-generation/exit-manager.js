// signal-generation/exit-manager.js
class ExitManager {
  constructor(config = {}) {
    this.useTrailingStop = config.useTrailingStop || false;
    this.trailingDistance = config.trailingDistance || 0.0015;
    this.partialTakeProfit = config.partialTakeProfit || false;
  }

  calculateExits(signal, ensemble) {
    const { entry, stopLoss, target } = signal.tradingParams;
    const direction = signal.signal;

    console.log("\n📍 [ExitManager] Calculating exits...");

    // Handle NO_SIGNAL case
    if (direction === "NO_SIGNAL" || !entry || !stopLoss || !target) {
      console.log("   ⚠️ NO_SIGNAL or invalid params - skipping exit calculation");
      return {
        stopLoss: { type: "NONE", price: null, distance: 0, conditions: [] },
        takeProfit: { type: "NONE", price: null, distance: 0, conditions: [] },
        trailingStop: null,
        partialTP: null
      };
    }

    console.log(`   Entry: ${entry}, StopLoss: ${stopLoss}, Target: ${target}`);

    const atr = ensemble.models.volatility.currentVolatility;

    const exits = {
      stopLoss: {
        type: "FIXED",
        price: stopLoss,
        distance: Math.abs(entry - stopLoss),
        conditions: [`Stop loss at ${stopLoss.toFixed(5)}`]
      },
      takeProfit: {
        type: "FIXED",
        price: target,
        distance: Math.abs(target - entry),
        conditions: [`Take profit at ${target.toFixed(5)}`]
      }
    };

    if (this.useTrailingStop) {
      exits.trailingStop = this.calculateTrailingStop(direction, entry, atr);
    }

    if (this.partialTakeProfit) {
      exits.partialTP = this.calculatePartialTP(entry, target, direction);
    }

    return exits;
  }

  calculateTrailingStop(direction, entry, atr) {
    console.log("   🔄 Adding Trailing Stop");
    const distance = this.trailingDistance;
    return {
      enabled: true,
      distance: Number(distance.toFixed(5)),
      activationLevel: direction === "BUY" ? entry * 1.005 : entry * 0.995,
      conditions: [
        "Activate trailing stop after ~0.5% move",
        `Trail by ${distance.toFixed(5)} (≈${(distance / atr).toFixed(1)}x ATR)`
      ]
    };
  }

  calculatePartialTP(entry, target, direction) {
    console.log("   🎯 Adding Partial Take Profit");
    const midpoint = (entry + target) / 2;
    return {
      enabled: true,
      level1: {
        price: Number(midpoint.toFixed(5)),
        percentage: 50,
        condition: "Close 50% at halfway"
      },
      level2: {
        price: Number(target.toFixed(5)),
        percentage: 50,
        condition: "Close 50% at target"
      }
    };
  }
}

module.exports = ExitManager;
