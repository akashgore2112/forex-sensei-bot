// rateLimiter.js
class RateLimiter {
  constructor(maxCalls = 5, timeWindow = 60000) { // default: 5 calls/min
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindow;
    this.calls = [];
  }

  async waitIfNeeded() {
    const now = Date.now();

    // Remove old calls outside time window
    this.calls = this.calls.filter(call => now - call < this.timeWindow);

    // If too many calls, wait
    if (this.calls.length >= this.maxCalls) {
      const oldestCall = Math.min(...this.calls);
      const waitTime = this.timeWindow - (now - oldestCall);

      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Record this call
    this.calls.push(Date.now());
  }
}

module.exports = RateLimiter;
