const SwingPipeline = require("./swing-pipeline");

const pipeline = new SwingPipeline("E391L86ZEMDYMFGP"); // tumhari Alpha Vantage key

async function runTest() {
  console.log("▶ First call: API se fetch karega");
  const data1 = await pipeline.getDailyData("EUR", "USD");
  console.log("Data length (first call):", data1.length);

  console.log("\n▶ Second call: Cache se load karega (API bach jayegi)");
  const data2 = await pipeline.getDailyData("EUR", "USD");
  console.log("Data length (second call):", data2.length);
}

runTest();
