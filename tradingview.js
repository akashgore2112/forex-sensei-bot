const WebSocket = require("ws");

const socket = new WebSocket("wss://data.tradingview.com/socket.io/websocket", {
  origin: "https://www.tradingview.com",
});

socket.on("open", () => {
  console.log("✅ Connected to TradingView WebSocket");

  const chartSession = "cs_" + Math.random().toString(36).substring(2, 15);
  const quoteSession = "qs_" + Math.random().toString(36).substring(2, 15);

  const sendMessage = (msg) => {
    socket.send(`~m~${msg.length}~m~${msg}`);
    console.log("➡️ Sent:", msg); // DEBUG LOG
  };

  // Authentication
  sendMessage(JSON.stringify({ m: "set_auth_token", p: ["unauthorized_user_token"] }));

  // Create sessions
  sendMessage(JSON.stringify({ m: "chart_create_session", p: [chartSession, ""] }));
  sendMessage(JSON.stringify({ m: "quote_create_session", p: [quoteSession] }));

  // Add symbol to quote session
sendMessage(
  JSON.stringify({
    m: "quote_add_symbols",
    p: [quoteSession, "FX:EURUSD", { flags: ["force_permission"] }],
  })
);

// Resolve symbol for chart session
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

// Subscribe candles (1m)
sendMessage(
  JSON.stringify({
    m: "create_series",
    p: [chartSession, "s1", "s1", "symbol_1", "1", 300],
  })
);

// Parse TradingView protocol messages
function parseMessage(message) {
  let parts = message.toString().split("~m~");
  for (let i = 1; i < parts.length; i += 2) {
    try {
      const data = JSON.parse(parts[i + 1]);
      handleData(data);
    } catch (err) {
      // Ignore keepalive or garbage packets
    }
  }
}

function handleData(data) {
  console.log("⬅️ Raw Response:", JSON.stringify(data)); // DEBUG LOG

  if (data.m === "timescale_update") {
    const candles = data.p[1].s1;
    if (candles) {
      candles.forEach((c) => {
        console.log(
          `📊 EUR/USD Candle: O:${c.o} H:${c.h} L:${c.l} C:${c.c} V:${c.v} T:${new Date(
            c.t * 1000
          ).toLocaleString()}`
        );
      });
    }
  }
}

socket.on("message", (msg) => parseMessage(msg));

socket.on("close", () => {
  console.log("❌ Disconnected from TradingView WebSocket");
});

socket.on("error", (err) => {
  console.error("⚠️ WebSocket Error:", err.message);
});
