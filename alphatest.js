const axios = require("axios");

// 🔑 Tumhari API key
const API_KEY = "E391L86ZEMDYMFGP";

// Function to fetch forex rate
async function getForexRate(from = "EUR", to = "USD") {
  try {
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`;
    const response = await axios.get(url);

    if (response.data["Realtime Currency Exchange Rate"]) {
      const rate = response.data["Realtime Currency Exchange Rate"]["5. Exchange Rate"];
      console.log(`💱 ${from}/${to} → ${rate}`);
    } else {
      console.log("❌ API limit ya response issue:", response.data);
    }
  } catch (error) {
    console.error("⚠️ Error fetching forex rate:", error.message);
  }
}

// Test run
getForexRate("EUR", "USD");
