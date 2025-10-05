// strategies/support-resistance-detector.js
const SwingDetector = require('../trading-patterns/swing-detector');

class SupportResistanceDetector {
  constructor(lookback = 20) {
    this.swingDetector = new SwingDetector(10);
    this.lookback = lookback;
    this.proximityThreshold = 0.002; // 0.2% = ~20 pips for EUR/USD
  }

  /**
   * Identify support and resistance zones from 4H candles
   */
  detectLevels(candles4H) {
    if (!candles4H || candles4H.length < this.lookback) {
      return { support: [], resistance: [] };
    }

    // Use recent candles for S/R
    const recentCandles = candles4H.slice(-this.lookback);

    // Find swing points
    const swingHighs = this.swingDetector.findSwingHighs(recentCandles);
    const swingLows = this.swingDetector.findSwingLows(recentCandles);

    // Cluster nearby swings (multiple touches = stronger level)
    const resistanceLevels = this.clusterLevels(swingHighs, 'HIGH');
    const supportLevels = this.clusterLevels(swingLows, 'LOW');

    return {
      support: supportLevels.slice(-3), // Top 3 support levels
      resistance: resistanceLevels.slice(-3), // Top 3 resistance levels
      allSwingHighs: swingHighs,
      allSwingLows: swingLows
    };
  }

  /**
   * Cluster swing points that are close together (multiple touches)
   */
  clusterLevels(swings, type) {
    if (swings.length === 0) return [];

    const clusters = [];
    const sorted = [...swings].sort((a, b) => a.price - b.price);

    let currentCluster = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = currentCluster[0].price;
      const curr = sorted[i].price;
      const distance = Math.abs(curr - prev) / prev;

      if (distance < this.proximityThreshold) {
        // Same level, add to cluster
        currentCluster.push(sorted[i]);
      } else {
        // New level, save previous cluster
        if (currentCluster.length > 0) {
          clusters.push(this.createLevel(currentCluster, type));
        }
        currentCluster = [sorted[i]];
      }
    }

    // Add final cluster
    if (currentCluster.length > 0) {
      clusters.push(this.createLevel(currentCluster, type));
    }

    return clusters;
  }

  /**
   * Create a level from cluster of swings
   */
  createLevel(cluster, type) {
    const prices = cluster.map(s => s.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    return {
      price: Number(avgPrice.toFixed(5)),
      touches: cluster.length,
      type: type,
      strength: cluster.length, // More touches = stronger level
      timestamps: cluster.map(s => s.timestamp)
    };
  }

  /**
   * Check if price is near a support/resistance level
   */
  isPriceNearLevel(currentPrice, levels, maxDistance = 0.0015) {
    for (const level of levels) {
      const distance = Math.abs(currentPrice - level.price) / level.price;
      if (distance <= maxDistance) {
        return {
          near: true,
          level: level,
          distance: Number((distance * 100).toFixed(2)) + '%'
        };
      }
    }
    return { near: false, level: null, distance: null };
  }
}

module.exports = SupportResistanceDetector;
