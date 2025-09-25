const WebSocket = require("ws");

// TradingView WebSocket server
const socket = new WebSocket("wss://data.tradingview.com/socket.io/websocket", {
  origin: "https://www.tradingview.com",
});

socket.on("open", () => {
  console.log("✅ Connected to TradingView WebSocket");

  // Session create
  const session = "qs_" + Math.random().toString(36).substring(2, 12);

  // Send function
  const send = (msg) => {
    socket.send(JSON.stringify(msg));
  };

  // Create quote session
  send({ m: "quote_create_session", p: [session] });

  // Add multiple symbols here
  const symbols = ["FX:EURUSD", "FX:GBPUSD", "OANDA:XAUUSD"];

  symbols.forEach((symbol) => {
    send({
      m: "quote_add_symbols",
      p: [session, symbol, { flags: ["force_permission"] }],
    });

    // Request data updates
    send({
      m: "quote_set_fields",
      p: [session, "lp", "volume", "bid", "ask", "change", "description"],
    });
  });

  // Heartbeat (TradingView ko connection alive dikhane ke liye)
  setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send("~h~" + Date.now());
      console.log("💓 Heartbeat sent");
    }
  }, 10000);
});

socket.on("message", (data) => {
  try {
    const msg = JSON.parse(data);
    if (msg.m === "quote_update") {
      console.log("📊 Live Update:", msg.p);
    }
  } catch (err) {
    // Ignore non-JSON messages
  }
});

socket.on("close", () => {
  console.log("❌ Disconnected from TradingView WebSocket");
});

socket.on("error", (err) => {
  console.error("⚠️ Error:", err);
});
