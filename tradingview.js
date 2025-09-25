const { getTvData } = require("tradingview-scraper");

(async () => {
  try {
    console.log("📡 Fetching EUR/USD data from TradingView...");

    const data = await getTvData("FX:EURUSD");
    console.log("✅ Data received:", data);
  } catch (err) {
    console.error("❌ Error fetching data:", err.message);
  }
})();
