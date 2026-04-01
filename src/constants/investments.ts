export const SIGNALS = [
  { ticker: "IBOV", symbol: "^BVSP", name: "Ibovespa", signal: "COMPRA", strength: 82, price: "127.840", change: +1.2, rsi: 60, macd: "↑", sentiment: 75, sector: "Índice" },
  { ticker: "USD/BRL", symbol: "USDBRL=X", name: "Dólar Comercial", signal: "NEUTRO", strength: 55, price: "R$ 4,98", change: +0.8, rsi: 50, macd: "→", sentiment: 50, sector: "Câmbio" },
  { ticker: "BTC", symbol: "BTC-USD", name: "Bitcoin", signal: "COMPRA", strength: 95, price: "US$ 83.420", change: +2.1, rsi: 75, macd: "↑", sentiment: 88, sector: "Cripto" },
  { ticker: "PETR4", symbol: "PETR4.SA", name: "Petrobras PN", signal: "COMPRA", strength: 87, price: "R$ 38,42", change: +2.3, rsi: 58, macd: "↑", sentiment: 72, sector: "Energia" },
  { ticker: "VALE3", symbol: "VALE3.SA", name: "Vale ON", signal: "COMPRA", strength: 74, price: "R$ 61,80", change: +1.1, rsi: 52, macd: "↑", sentiment: 65, sector: "Mineração" },
  { ticker: "ITUB4", symbol: "ITUB4.SA", name: "Itaú Unibanco", signal: "NEUTRO", strength: 51, price: "R$ 34,90", change: -0.4, rsi: 49, macd: "→", sentiment: 58, sector: "Financeiro" },
  { ticker: "BBDC4", symbol: "BBDC4.SA", name: "Bradesco PN", signal: "VENDA", strength: 68, price: "R$ 14,22", change: -1.8, rsi: 71, macd: "↓", sentiment: 38, sector: "Financeiro" },
  { ticker: "MGLU3", symbol: "MGLU3.SA", name: "Magazine Luiza", signal: "COMPRA", strength: 79, price: "R$ 8,55", change: +3.7, rsi: 44, macd: "↑", sentiment: 81, sector: "Varejo" },
  { ticker: "WEGE3", symbol: "WEGE3.SA", name: "WEG SA", signal: "COMPRA", strength: 91, price: "R$ 52,10", change: +0.9, rsi: 55, macd: "↑", sentiment: 78, sector: "Industrial" },
];

export const MARKET_DATA = [
  { name: "IBOVESPA", symbol: "^BVSP", value: "127.840", change: +1.2 },
  { name: "USD/BRL", symbol: "USDBRL=X", value: "4,98", change: +0.8 },
  { name: "BTC/USD", symbol: "BTC-USD", value: "83.420", change: +2.1 },
  { name: "PETR4", symbol: "PETR4.SA", value: "38,42", change: +2.3 },
  { name: "VALE3", symbol: "VALE3.SA", value: "61,80", change: +1.1 },
  { name: "ITUB4", symbol: "ITUB4.SA", value: "34,90", change: -0.4 },
];

export const SENTIMENT_NEWS = [
  { source: "Reuters", text: "Petrobras anuncia dividendos extraordinários para o Q2", impact: "positivo", time: "2h" },
  { source: "Valor Econômico", text: "Vale reporta produção recorde de minério de ferro", impact: "positivo", time: "4h" },
  { source: "InfoMoney", text: "Bradesco revisa guidance para baixo após resultado fraco", impact: "negativo", time: "5h" },
  { source: "Bloomberg", text: "Banco Central sinaliza manutenção da Selic em próxima reunião", impact: "neutro", time: "6h" },
];
