const WebSocket = require("ws");

// TradingView WebSocket server (unofficial reverse-engineered endpoint)
const SOCKET_URL = "wss://data.tradingview.com/socket.io/websocket";

// Currency pair (example: EUR/USD)
const SYMBOL = "FX:EURUSD";

// WebSocket client
const ws = new WebSocket(SOCKET_URL, {
  origin: "https://www.tradingview.com",
});

ws.on("open", () => {
  console.log("✅ Connected to TradingView WebSocket");

  // Request subscribe
  const session = "qs_" + Math.random().toString(36).substring(2, 12);
  ws.send(JSON.stringify(["set_auth_token", "unauthorized_user_token"]));
  ws.send(JSON.stringify(["chart_create_session", session]));
  ws.send(JSON.stringify(["resolve_symbol", session, "s1", SYMBOL]));
  ws.send(
    JSON.stringify([
      "create_series",
      session,
      "s1",
      "s1",
      "1",
      300, // timeframe (300 = 5 minutes)
    ])
  );
});

ws.on("message", (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg && msg.length && msg[0] === "timescale_update") {
      console.log("📊 New Data:", JSON.stringify(msg[1], null, 2));
    }
  } catch (err) {
    console.log("⚠️ Error parsing data:", err.message);
  }
});

ws.on("close", () => {
  console.log("❌ Disconnected from TradingView WebSocket");
});

ws.on("error", (err) => {
  console.error("⚠️ WebSocket Error:", err.message);
});
