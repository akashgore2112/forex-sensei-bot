const { getIndicators, getTicker } = require("tradingview-scraper");

// Example: EURUSD ka ticker fetch karna
(async () => {
  try {
    console.log("📡 Fetching EUR/USD data from TradingView...");

    const ticker = await getTicker("FX:EURUSD");
    console.log("✅ Data received:", ticker);
  } catch (err) {
    console.error("❌ Error fetching data:", err.message);
  }
})();
