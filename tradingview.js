const { TradingViewScan } = require("tradingview-scraper");

(async () => {
  try {
    const scan = new TradingViewScan();
    await scan.init();

    // Multiple Forex Pairs
    const pairs = ["EURUSD", "GBPUSD", "XAUUSD"];

    for (let pair of pairs) {
      const result = await scan.scan(pair, "FX_IDC"); // FX_IDC = Forex data
      console.log(`📊 ${pair} → Price: ${result.price}`);
    }

    scan.close();
  } catch (error) {
    console.error("❌ Error fetching data:", error);
  }
})();
