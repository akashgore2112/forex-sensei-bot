const { Telegraf, Markup } = require("telegraf");

// 👉 BotFather se liya hua token
const bot = new Telegraf("8457020079:AAFjxDOQssf99Ql3DkOeN-X7l0HaS-vsWnA");

// Start command
bot.start((ctx) => {
  ctx.reply(
    "👋 Welcome to *Forex Sensei Bot (The Trading Dojo)*!\n\n" +
    "Choose an option below to begin your journey:",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📊 Daily Signals", "DAILY_SIGNALS")],
        [Markup.button.callback("🤖 AI Forex Q&A", "AI_QA")],
        [Markup.button.callback("📚 Learning Zone", "LEARNING_ZONE")],
        [Markup.button.callback("🎁 Free Resources", "FREE_RESOURCES")],
        [Markup.button.callback("👥 Community", "COMMUNITY")]
      ])
    }
  );
});

// Menu command (manual trigger)
bot.command("menu", (ctx) => {
  ctx.reply(
    "📌 *Main Menu* – Choose an option:",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📊 Daily Signals", "DAILY_SIGNALS")],
        [Markup.button.callback("🤖 AI Forex Q&A", "AI_QA")],
        [Markup.button.callback("📚 Learning Zone", "LEARNING_ZONE")],
        [Markup.button.callback("🎁 Free Resources", "FREE_RESOURCES")],
        [Markup.button.callback("👥 Community", "COMMUNITY")]
      ])
    }
  );
});


// 👉 Button actions

// Daily Signals
bot.action("DAILY_SIGNALS", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("📊 *Today’s Forex Signal:*\n\nEUR/USD BUY @ 1.0830\nSL: 1.0810\nTP: 1.0870\n\n⚠️ Tip: Don’t risk more than 2% per trade.", { parse_mode: "Markdown" });
});

// AI Q&A (placeholder for now)
bot.action("AI_QA", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("🤖 AI Q&A coming soon! Ask me about Forex basics & strategies.");
});

// Learning Zone
bot.action("LEARNING_ZONE", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("📚 Lesson 1: What is Forex?\n\nForex = Foreign Exchange market where currencies are traded.\n\n⚠️ Always practice with demo before live trading.");
});

// Free Resources
bot.action("FREE_RESOURCES", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("🎁 Free Resource: [Download Forex Survival Kit PDF](https://example.com/free-pdf)", { parse_mode: "Markdown" });
});

// Community
bot.action("COMMUNITY", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("👥 Join our Dojo Community here: https://t.me/joinchat/example");
});

// Bot launch
bot.launch();
console.log("✅ Forex Sensei Bot with Main Menu is running...");
