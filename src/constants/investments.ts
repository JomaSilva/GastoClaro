export const SIGNALS = [
  { ticker: "IBOV", symbol: "^BVSP", name: "Ibovespa", region: "BR", signal: "COMPRA", strength: 82, price: "127.840", change: +1.2, rsi: 60, macd: "↑", sentiment: 75, sector: "Índice" },
  { ticker: "USD/BRL", symbol: "USDBRL=X", name: "Dólar Comercial", region: "BR", signal: "NEUTRO", strength: 55, price: "R$ 4,98", change: +0.8, rsi: 50, macd: "→", sentiment: 50, sector: "Câmbio" },
  { ticker: "BTC", symbol: "BTC-USD", name: "Bitcoin", region: "BR", signal: "COMPRA", strength: 95, price: "US$ 83.420", change: +2.1, rsi: 75, macd: "↑", sentiment: 88, sector: "Cripto" },
  { ticker: "PETR4", symbol: "PETR4.SA", name: "Petrobras PN", region: "BR", signal: "COMPRA", strength: 87, price: "R$ 38,42", change: +2.3, rsi: 58, macd: "↑", sentiment: 72, sector: "Energia" },
  { ticker: "VALE3", symbol: "VALE3.SA", name: "Vale ON", region: "BR", signal: "COMPRA", strength: 74, price: "R$ 61,80", change: +1.1, rsi: 52, macd: "↑", sentiment: 65, sector: "Mineração" },
  { ticker: "ITUB4", symbol: "ITUB4.SA", name: "Itaú Unibanco", region: "BR", signal: "NEUTRO", strength: 51, price: "R$ 34,90", change: -0.4, rsi: 49, macd: "→", sentiment: 58, sector: "Financeiro" },
  { ticker: "BBDC4", symbol: "BBDC4.SA", name: "Bradesco PN", region: "BR", signal: "VENDA", strength: 68, price: "R$ 14,22", change: -1.8, rsi: 71, macd: "↓", sentiment: 38, sector: "Financeiro" },
  { ticker: "MGLU3", symbol: "MGLU3.SA", name: "Magazine Luiza", region: "BR", signal: "COMPRA", strength: 79, price: "R$ 8,55", change: +3.7, rsi: 44, macd: "↑", sentiment: 81, sector: "Varejo" },
  { ticker: "WEGE3", symbol: "WEGE3.SA", name: "WEG SA", region: "BR", signal: "COMPRA", strength: 91, price: "R$ 52,10", change: +0.9, rsi: 55, macd: "↑", sentiment: 78, sector: "Industrial" },
  // ---- Mercado americano ----
  { ticker: "S&P 500", symbol: "^GSPC", name: "S&P 500", region: "US", signal: "COMPRA", strength: 80, price: "US$ 5.430", change: +0.7, rsi: 58, macd: "↑", sentiment: 72, sector: "Índice" },
  { ticker: "NASDAQ", symbol: "^IXIC", name: "Nasdaq Composite", region: "US", signal: "COMPRA", strength: 83, price: "US$ 17.680", change: +1.0, rsi: 61, macd: "↑", sentiment: 76, sector: "Índice" },
  { ticker: "AAPL", symbol: "AAPL", name: "Apple Inc.", region: "US", signal: "COMPRA", strength: 84, price: "US$ 213,40", change: +1.3, rsi: 59, macd: "↑", sentiment: 77, sector: "Tecnologia" },
  { ticker: "MSFT", symbol: "MSFT", name: "Microsoft", region: "US", signal: "COMPRA", strength: 86, price: "US$ 447,20", change: +0.9, rsi: 60, macd: "↑", sentiment: 79, sector: "Tecnologia" },
  { ticker: "NVDA", symbol: "NVDA", name: "NVIDIA", region: "US", signal: "COMPRA", strength: 93, price: "US$ 131,80", change: +2.6, rsi: 68, macd: "↑", sentiment: 90, sector: "Semicondutores" },
  { ticker: "TSLA", symbol: "TSLA", name: "Tesla", region: "US", signal: "NEUTRO", strength: 54, price: "US$ 182,60", change: -0.6, rsi: 48, macd: "→", sentiment: 55, sector: "Automotivo" },
  { ticker: "DOW JONES", symbol: "^DJI", name: "Dow Jones", region: "US", signal: "COMPRA", strength: 76, price: "US$ 39.150", change: +0.5, rsi: 56, macd: "↑", sentiment: 70, sector: "Índice" },
  { ticker: "GOOGL", symbol: "GOOGL", name: "Alphabet", region: "US", signal: "COMPRA", strength: 82, price: "US$ 178,30", change: +1.1, rsi: 58, macd: "↑", sentiment: 75, sector: "Tecnologia" },
  { ticker: "AMZN", symbol: "AMZN", name: "Amazon", region: "US", signal: "COMPRA", strength: 81, price: "US$ 186,40", change: +1.4, rsi: 57, macd: "↑", sentiment: 74, sector: "Varejo" },
  { ticker: "META", symbol: "META", name: "Meta Platforms", region: "US", signal: "COMPRA", strength: 85, price: "US$ 504,20", change: +1.8, rsi: 62, macd: "↑", sentiment: 80, sector: "Tecnologia" },
];

export const MARKET_DATA = [
  { name: "IBOVESPA", symbol: "^BVSP", value: "127.840", change: +1.2, currency: "BRL" },
  { name: "USD/BRL", symbol: "USDBRL=X", value: "4,98", change: +0.8, currency: "BRL" },
  { name: "BTC/USD", symbol: "BTC-USD", value: "83.420", change: +2.1, currency: "USD" },
  { name: "PETR4", symbol: "PETR4.SA", value: "38,42", change: +2.3, currency: "BRL" },
  { name: "S&P 500", symbol: "^GSPC", value: "5,430.00", change: +0.7, currency: "USD" },
  { name: "AAPL", symbol: "AAPL", value: "213.40", change: +1.3, currency: "USD" },
  { name: "NVDA", symbol: "NVDA", value: "131.80", change: +2.6, currency: "USD" },
];

export const SENTIMENT_NEWS = [
  { source: "Reuters", text: "Petrobras anuncia dividendos extraordinários para o Q2", impact: "positivo", time: "2h" },
  { source: "Valor Econômico", text: "Vale reporta produção recorde de minério de ferro", impact: "positivo", time: "4h" },
  { source: "InfoMoney", text: "Bradesco revisa guidance para baixo após resultado fraco", impact: "negativo", time: "5h" },
  { source: "Bloomberg", text: "Banco Central sinaliza manutenção da Selic em próxima reunião", impact: "neutro", time: "6h" },
];
