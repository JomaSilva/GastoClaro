import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const options = { 
      period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      period2: new Date().toISOString().split('T')[0]
    };
    const res = await yahooFinance.chart("PETR4.SA", options);
    console.log("Quotes:", res.quotes[0]);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
