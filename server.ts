import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

console.log(">>> SERVER BOOTING...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/market-data", async (req, res) => {
    console.log("Fetching market data...");
    try {
      const symbols = [
        "^BVSP", "USDBRL=X", "BTC-USD", 
        "PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "MGLU3.SA", "WEGE3.SA",
        "ABEV3.SA", "B3SA3.SA", "ELET3.SA", "RENT3.SA", "BBAS3.SA", "SUZB3.SA", "RADL3.SA"
      ];
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const quote: any = await yahooFinance.quote(symbol);
            if (!quote) {
              console.warn(`No quote returned for ${symbol}`);
              return null;
            }
            let news = [];
            try {
              const search = await yahooFinance.search(symbol);
              news = search.news?.slice(0, 3).map((n: any) => n.title) || [];
            } catch (e) {
              console.warn(`Could not fetch news for ${symbol}`);
            }
            return {
              symbol,
              name: quote.shortName || quote.longName || symbol,
              price: quote.regularMarketPrice ?? 0,
              change: quote.regularMarketChangePercent ?? 0,
              currency: quote.currency,
              news
            };
          } catch (e) {
            console.error(`Error fetching ${symbol}:`, e);
            return null;
          }
        })
      );

      const filteredResults = results.filter((r) => r !== null);
      console.log(`Successfully fetched ${filteredResults.length} symbols`);
      res.json(filteredResults);
    } catch (error) {
      console.error("Critical error in /api/market-data:", error);
      res.status(500).json({ error: "Failed to fetch market data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/historical/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      // Fetch last 90 days of historical data
      const queryOptions = { 
        period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period2: new Date().toISOString().split('T')[0]
      };
      const result = await yahooFinance.chart(symbol, queryOptions);
      res.json(result.quotes || []);
    } catch (error) {
      console.error(`Error fetching historical data for ${req.params.symbol}:`, error);
      res.status(500).json({ error: "Failed to fetch historical data" });
    }
  });

  app.get("/api/asset-context/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      console.log(`Fetching context for ${symbol}...`);
      
      const quote = await yahooFinance.quote(symbol).catch(() => null);
      
      let summary = null;
      try {
        summary = await yahooFinance.quoteSummary(symbol, {
          modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'assetProfile']
        });
      } catch (e) {
        console.warn(`Could not fetch quoteSummary for ${symbol}`);
      }

      let news = [];
      try {
        const search = await yahooFinance.search(symbol);
        news = search.news || [];
      } catch (e) {
        console.warn(`Could not fetch news for ${symbol}`);
      }

      res.json({
        symbol,
        quote,
        summary,
        news
      });
    } catch (error) {
      console.error(`Error fetching context for ${req.params.symbol}:`, error);
      res.status(500).json({ error: "Failed to fetch asset context" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
