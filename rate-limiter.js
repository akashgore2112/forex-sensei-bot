class RateLimiter {
  constructor(maxCalls, timeWindowMs) {
    this.maxCalls = maxCalls;
    this.timeWindowMs = timeWindowMs;
    this.calls = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    this.calls = this.calls.filter(ts => now - ts < this.timeWindowMs);

    if (this.calls.length >= this.maxCalls) {
      const waitTime = this.timeWindowMs - (now - this.calls[0]);
      console.log(`⏳ Rate limit reached. Waiting ${waitTime / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.calls.push(Date.now());
  }
}

module.exports = RateLimiter;
