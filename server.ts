import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import YahooFinance from "yahoo-finance2";
import { analyzeAsset, generateBatchSignals, processExpenses } from "./server/anthropic";
import { fetchAssetNews, summarizeNewsCoverage } from "./server/news";
import { createAuthRouter, createCheckoutRouter } from "./server/auth";

const yahooFinance = new YahooFinance();

console.log(">>> SERVER BOOTING...");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "25mb" }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Autenticação local (SQLite) e checkout de planos
  app.use("/api/auth", createAuthRouter());
  app.use("/api/checkout", createCheckoutRouter());

  app.post("/api/ai/process-expenses", async (req, res) => {
    try {
      const { text = "", imagesData = [] } = req.body ?? {};

      if (typeof text !== "string" || !Array.isArray(imagesData)) {
        res.status(400).json({ error: "Payload inválido para processar gastos." });
        return;
      }

      const report = await processExpenses(text, imagesData);
      res.json(report);
    } catch (error) {
      console.error("Error in /api/ai/process-expenses:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao processar gastos." });
    }
  });

  app.post("/api/ai/generate-batch-signals", async (req, res) => {
    try {
      const { marketData = [] } = req.body ?? {};

      if (!Array.isArray(marketData)) {
        res.status(400).json({ error: "Payload inválido para gerar sinais." });
        return;
      }

      const results = await generateBatchSignals(marketData);
      res.json(results);
    } catch (error) {
      console.error("Error in /api/ai/generate-batch-signals:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao gerar sinais." });
    }
  });

  app.post("/api/ai/analyze-asset", async (req, res) => {
    try {
      const { symbol, contextData } = req.body ?? {};

      if (typeof symbol !== "string" || !symbol.trim()) {
        res.status(400).json({ error: "Payload inválido para analisar ativo." });
        return;
      }

      const analysis = await analyzeAsset(symbol, contextData ?? {});
      res.json({ analysis });
    } catch (error) {
      console.error("Error in /api/ai/analyze-asset:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao analisar ativo." });
    }
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

            const news = await fetchAssetNews({
              symbol,
              yahooFinance,
              shortName: quote.shortName,
              longName: quote.longName,
              maxItems: 5,
            });

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

      const news = await fetchAssetNews({
        symbol,
        yahooFinance,
        shortName: quote?.shortName,
        longName: quote?.longName,
        maxItems: 12,
      });

      res.json({
        symbol,
        quote,
        summary,
        news,
        newsSummary: summarizeNewsCoverage(news),
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
