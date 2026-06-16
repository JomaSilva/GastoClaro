import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MARKET_DATA as FALLBACK_DATA } from '../constants/investments';
import axios from 'axios';

interface MarketItem {
  name: string;
  value: string | number;
  change: number;
  currency?: string;
}

function formatTickerValue(price: number, currency?: string): string {
  const locale = currency === 'USD' ? 'en-US' : 'pt-BR';
  return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MarketTicker() {
  const [offset, setOffset] = useState(0);
  const [marketData, setMarketData] = useState<MarketItem[]>(FALLBACK_DATA);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await axios.get('/api/market-data');
        if (!Array.isArray(response.data)) {
          throw new Error('Invalid data format received from server');
        }
        const formattedData = response.data.map((item: any) => ({
          name: (item.name || item.symbol || '').replace('^BVSP', 'IBOVESPA').replace('USDBRL=X', 'USD/BRL').replace('BTC-USD', 'BTC/USD').replace('^GSPC', 'S&P 500').replace('^IXIC', 'NASDAQ').replace('^DJI', 'DOW JONES').replace('.SA', ''),
          value: formatTickerValue(typeof item.price === 'number' ? item.price : 0, item.currency),
          change: typeof item.change === 'number' ? item.change : 0,
          currency: item.currency,
        }));
        if (formattedData.length > 0) {
          setMarketData(formattedData);
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
        // Fallback is already set in state (FALLBACK_DATA)
      }
    };

    fetchMarketData();
    const dataInterval = setInterval(fetchMarketData, 60000); // Update every minute
    return () => clearInterval(dataInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev - 1) % 1000);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Triple the data to ensure smooth infinite scroll
  const items = [...marketData, ...marketData, ...marketData];

  return (
    <div className="overflow-hidden border-b bg-white/50 py-2 backdrop-blur-sm transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-950/50">
      <div 
        className="flex gap-12 whitespace-nowrap transition-none"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {items.map((m, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="font-bold text-zinc-500 dark:text-zinc-400">{m.name}</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{m.value}</span>
            <span className={`flex items-center gap-0.5 font-bold ${m.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {m.change > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(m.change)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
