const WebSocket = require("ws");

// TradingView WebSocket URL
const socket = new WebSocket("wss://data.tradingview.com/socket.io/websocket", {
  origin: "https://www.tradingview.com",
});

function sendMessage(msg) {
  console.log(">>", msg);
  socket.send(msg);
}

socket.on("open", () => {
  console.log("✅ Connected to TradingView WebSocket");

  // Create sessions
  const quoteSession = "qs_" + Math.random().toString(36).substring(2, 12);
  const chartSession = "cs_" + Math.random().toString(36).substring(2, 12);

  // -------------------
  // Auth (guest user)
  sendMessage(JSON.stringify({ m: "set_auth_token", p: ["unauthorized_user_token"] }));

  // Quote session
  sendMessage(JSON.stringify({ m: "quote_create_session", p: [quoteSession] }));

  // Add symbol (FIXED → FX:EURUSD instead of FX_IDC)
  sendMessage(
    JSON.stringify({
      m: "quote_add_symbols",
      p: [quoteSession, "FX:EURUSD", { flags: ["force_permission"] }],
    })
  );

  // Chart session
  sendMessage(JSON.stringify({ m: "chart_create_session", p: [chartSession] }));

  // Resolve symbol
  sendMessage(
    JSON.stringify({
      m: "resolve_symbol",
      p: [
        chartSession,
        "symbol_1",
        '{"symbol":"FX:EURUSD","adjustment":"splits","session":"regular"}',
      ],
    })
  );

  // Subscribe candles (1-minute)
  sendMessage(
    JSON.stringify({
      m: "create_series",
      p: [chartSession, "s1", "s1", "symbol_1", "1", 300],
    })
  );

  // -------------------
  // Test keep-alive ping
  setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send("~h~" + Date.now());
    }
  }, 10000);
});

socket.on("message", (msg) => {
  if (msg.includes("timescale_update")) {
    console.log("📊 Price Update:", msg);
  }
});

socket.on("close", () => {
  console.log("❌ Disconnected from TradingView WebSocket");
});
