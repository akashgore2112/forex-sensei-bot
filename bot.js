const { Telegraf, Markup } = require("telegraf");

// 👉 Tumhara BotFather ka token yaha daalo
const bot = new Telegraf("8457020079:AAFjxDOQssf99Ql3DkOeN-X7l0HaS-vsWnA");

// Start command
bot.start((ctx) => {
  ctx.reply(
    "👋 Welcome to Forex Sensei Bot (The Trading Dojo)!\n\nType /menu to explore."
  );
});

// Menu command with clickable buttons
bot.command("menu", (ctx) => {
  ctx.reply(
    "📊 Choose an option:",
    Markup.inlineKeyboard([
      [Markup.button.callback("📊 Daily Signals", "DAILY_SIGNAL")],
      [Markup.button.callback("🤖 AI Q&A (coming soon)", "AI_QA")],
      [Markup.button.callback("📚 Learning Zone (coming soon)", "LEARN_ZONE")]
    ])
  );
});

// Daily Signals handler
bot.action("DAILY_SIGNAL", (ctx) => {
  ctx.answerCbQuery(); // notification dismiss
  ctx.reply(
    "📊 Today’s Forex Signal:\n\nEUR/USD BUY @ 1.0830\nSL: 1.0810\nTP: 1.0870\n\n⚠️ Risk: Don’t risk more than 2% per trade."
  );
});

// Placeholder for AI Q&A
bot.action("AI_QA", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("🤖 AI Q&A is coming soon! 🚀");
});

// Placeholder for Learning Zone
bot.action("LEARN_ZONE", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("📚 Learning Zone is coming soon! Stay tuned 🔥");
});

// Bot launch
bot.launch();
console.log("✅ Forex Sensei Bot is running...");