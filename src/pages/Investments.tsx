import React, { useState, useEffect } from 'react';
import { 
  Radar, 
  Zap, 
  Search, 
  Star, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Bell, 
  BellOff, 
  X, 
  ChevronRight,
  Info,
  ExternalLink,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useTheme } from '../components/ThemeProvider';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { analyzeAsset, generateBatchSignals } from '../services/claude';

import { SIGNALS as INITIAL_SIGNALS, SENTIMENT_NEWS } from '../constants/investments';

// Nomes amigáveis para símbolos especiais (índices/câmbio/cripto BR e EUA).
const TICKER_LABELS: Record<string, string> = {
  '^BVSP': 'IBOVESPA',
  'USDBRL=X': 'USD/BRL',
  'BTC-USD': 'BTC/USD',
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'DOW JONES',
};

function tickerLabel(symbol: string): string {
  return TICKER_LABELS[symbol] || symbol.replace('.SA', '');
}

function formatAssetPrice(price: number, currency?: string, region?: 'BR' | 'US'): string {
  const safeCurrency =
    currency === 'USD' || currency === 'BRL' ? currency : region === 'US' ? 'USD' : 'BRL';
  const locale = safeCurrency === 'USD' ? 'en-US' : 'pt-BR';
  return price.toLocaleString(locale, { style: 'currency', currency: safeCurrency });
}

function regionOf(symbol: string, region?: string): 'BR' | 'US' {
  if (region === 'US' || region === 'BR') return region;
  return /^(AAPL|MSFT|NVDA|GOOGL|AMZN|TSLA|META)$|^\^(GSPC|IXIC|DJI)$/.test(symbol) ? 'US' : 'BR';
}

function SignalBadge({ signal }: { signal: string }) {
  const cfg: Record<string, { bg: string, text: string, label: string }> = {
    COMPRA: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "COMPRA" },
    VENDA: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", label: "VENDA" },
    NEUTRO: { bg: "bg-brand-100 dark:bg-brand-900/30", text: "text-brand-700 dark:text-brand-400", label: "NEUTRO" },
  };
  const current = cfg[signal] || cfg.NEUTRO;
  return (
    <span className={cn(
      "rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider border",
      current.bg,
      current.text,
      "border-current/20"
    )}>
      {current.label}
    </span>
  );
}

function StrengthBar({ value, signal }: { value: number, signal: string }) {
  const color = signal === "COMPRA" ? "bg-emerald-500" : signal === "VENDA" ? "bg-rose-500" : "bg-brand-500";
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div 
        className={cn("h-full transition-all duration-1000", color)}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function MiniSparkline({ up }: { up: boolean }) {
  const points = up
    ? "0,20 10,18 20,15 30,16 40,12 50,10 60,8 70,6 80,4 90,2"
    : "0,4 10,6 20,8 30,7 40,10 50,13 60,12 70,15 80,17 90,20";
  return (
    <svg width="60" height="24" viewBox="0 0 90 24" className="opacity-80">
      <polyline 
        points={points} 
        fill="none"
        stroke={up ? "#10b981" : "#f43f5e"}
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

function AssetDetailsModal({ asset, onClose }: { asset: any, onClose: () => void }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chart' | 'ai'>('chart');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Símbolo de moeda do ativo (US$ para ativos americanos, R$ caso contrário).
  const curSymbol =
    asset.currency === 'USD' || regionOf(asset.symbol, asset.region) === 'US' ? 'US$' : 'R$';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`/api/historical/${encodeURIComponent(asset.symbol)}`);
        const formatted = res.data.map((d: any) => ({
          date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          price: d.close
        }));
        setChartData(formatted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [asset.symbol]);

  const handleGenerateAnalysis = async () => {
    if (aiAnalysis) return;
    setIsAnalyzing(true);
    try {
      const contextRes = await axios.get(`/api/asset-context/${encodeURIComponent(asset.symbol)}`);
      const analysis = await analyzeAsset(asset.symbol, contextRes.data);
      setAiAnalysis(analysis);
    } catch (e) {
      console.error(e);
      setAiAnalysis("Não foi possível gerar a análise no momento. Tente novamente mais tarde.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white/90 dark:bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-2xl border border-white/20 dark:border-zinc-800/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-4xl font-light text-zinc-900 dark:text-white tracking-tight font-serif">{asset.ticker}</h2>
              <SignalBadge signal={asset.signal} />
            </div>
            <p className="text-sm font-light text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{asset.name} · {asset.sector}</p>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/50 dark:bg-zinc-950/50 p-5 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Preço Atual</div>
            <div className="text-2xl font-light text-zinc-900 dark:text-white">{asset.price}</div>
          </div>
          <div className="rounded-2xl bg-white/50 dark:bg-zinc-950/50 p-5 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Variação (24h)</div>
            <div className={cn("text-2xl font-light flex items-center gap-1.5", asset.change > 0 ? "text-emerald-500" : "text-rose-500")}>
              {asset.change > 0 ? <TrendingUp size={20} strokeWidth={1.5} /> : <TrendingDown size={20} strokeWidth={1.5} />}
              {Math.abs(asset.change)}%
            </div>
          </div>
          <div className="rounded-2xl bg-white/50 dark:bg-zinc-950/50 p-5 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Força IA</div>
            <div className="text-2xl font-light gold-gradient">{asset.strength}%</div>
          </div>
          <div className="rounded-2xl bg-white/50 dark:bg-zinc-950/50 p-5 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Sentimento</div>
            <div className="text-2xl font-light text-blue-500">{asset.sentiment}%</div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-px">
          <button
            onClick={() => setActiveTab('chart')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === 'chart' 
                ? "text-brand-600 dark:text-brand-400" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            Gráfico Histórico
            {activeTab === 'chart' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('ai');
              handleGenerateAnalysis();
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2",
              activeTab === 'ai' 
                ? "text-brand-600 dark:text-brand-400" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <BrainCircuit size={16} />
            Análise IA Premium
            {activeTab === 'ai' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-t-full" />
            )}
          </button>
        </div>

        <div className="min-h-[300px] w-full">
          {activeTab === 'chart' ? (
            loading ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-zinc-500 animate-pulse">
                Carregando histórico de 90 dias...
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" fontSize={10} tickMargin={10} stroke="#888888" minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} fontSize={10} tickFormatter={(val) => `${curSymbol}${val.toFixed(2)}`} stroke="#888888" width={60} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${curSymbol} ${value.toFixed(2)}`, 'Preço']}
                  />
                  <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-medium text-zinc-500">
                Dados históricos indisponíveis no momento.
              </div>
            )
          ) : (
            <div className="h-full w-full">
              {isAnalyzing ? (
                <div className="flex flex-col h-full items-center justify-center space-y-4 py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  <p className="text-sm font-medium text-zinc-500 animate-pulse">
                    Coletando fundamentos, notícias e processando análise híbrida...
                  </p>
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-serif prose-h1:text-2xl prose-h3:text-lg prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-li:text-zinc-600 dark:prose-li:text-zinc-400">
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RadarScreen({ signals, onSelectAsset, isAnalyzing }: { signals: any[], onSelectAsset: (asset: any) => void, isAnalyzing?: boolean }) {
  const topSignals = signals.filter(s => s.signal === "COMPRA");
  return (
    <div className="space-y-6">
      {isAnalyzing && (
        <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 text-brand-700 dark:text-brand-400">
          <BrainCircuit size={20} className="animate-pulse" />
          <span className="text-sm font-medium">A IA está analisando as notícias e o contexto macroeconômico global para atualizar os sinais...</span>
        </div>
      )}
      {/* Header Resumo */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Sinais Hoje", value: "14", sub: "↑ 6 compra · ↓ 4 venda", color: "text-brand-600 dark:text-brand-400" },
          { label: "Acurácia 30d", value: "67%", sub: "Baseado em backtesting", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Oportunidades", value: "8", sub: "Alta probabilidade", color: "text-blue-600 dark:text-blue-400" },
          { label: "Sentimento Geral", value: "Otimista", sub: "Score: 68/100", color: "text-indigo-600 dark:text-indigo-400" },
        ].map((kpi, i) => (
          <div key={i} className="glass rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">{kpi.label}</div>
            <div className={cn("text-3xl font-light tracking-tight font-serif", kpi.color)}>{kpi.value}</div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Top Picks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Zap size={14} className="text-brand-500" /> Top Oportunidades
          </h3>
          <button className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline">Ver todos →</button>
        </div>
        <div className="space-y-3">
          {topSignals.map((s, i) => (
            <div key={i} onClick={() => onSelectAsset(s)} className="glass rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group hover:border-emerald-500/30 transition-all cursor-pointer">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-light text-zinc-900 dark:text-white font-serif">{s.ticker}</span>
                    <SignalBadge signal={s.signal} />
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{s.name} · {s.sector}</div>
                  {s.rationale && (
                    <div className="mt-3 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 flex items-start gap-2">
                      <BrainCircuit size={14} className="shrink-0 mt-0.5 text-brand-500" />
                      <span className="leading-relaxed">{s.rationale}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-base font-medium text-zinc-900 dark:text-white font-mono">{s.price}</div>
                  <div className={cn("text-xs font-bold flex items-center justify-end gap-0.5", s.change > 0 ? "text-emerald-600" : "text-rose-600")}>
                    {s.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(s.change)}%
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Força", value: `${s.strength}%` },
                  { label: "RSI", value: s.rsi },
                  { label: "MACD", value: s.macd },
                  { label: "Sentim.", value: `${s.sentiment}%` },
                ].map((m, j) => (
                  <div key={j} className="text-center">
                    <div className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-bold">{m.label}</div>
                    <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{m.value}</div>
                  </div>
                ))}
              </div>
              <StrengthBar value={s.strength} signal={s.signal} />
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Setores */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Radar size={14} className="text-blue-500" /> Calor por Setor
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "Energia", v: +2.1 }, { name: "Financeiro", v: -0.8 }, { name: "Varejo", v: +3.2 },
            { name: "Industrial", v: +1.4 }, { name: "Mineração", v: +0.9 }, { name: "Saúde", v: -1.1 },
          ].map((sec, i) => {
            const intensity = Math.abs(sec.v) / 4;
            const isPos = sec.v > 0;
            return (
              <div key={i} className={cn(
                "rounded-xl p-3 text-center border transition-all",
                isPos 
                  ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30" 
                  : "bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800/30"
              )}>
                <div className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 mb-1 uppercase">{sec.name}</div>
                <div className={cn("text-sm font-bold", isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {isPos ? "+" : ""}{sec.v}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SignalsScreen({ signals, onSelectAsset, isAnalyzing }: { signals: any[], onSelectAsset: (asset: any) => void, isAnalyzing?: boolean }) {
  const [filter, setFilter] = useState("TODOS");
  const filtered = filter === "TODOS" ? signals : signals.filter(s => s.signal === filter);
  return (
    <div className="space-y-6">
      {isAnalyzing && (
        <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 text-brand-700 dark:text-brand-400">
          <BrainCircuit size={20} className="animate-pulse" />
          <span className="text-sm font-medium">A IA está analisando as notícias e o contexto macroeconômico global para atualizar os sinais...</span>
        </div>
      )}
      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
        {["TODOS", "COMPRA", "NEUTRO", "VENDA"].map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)} 
            className={cn(
              "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
              filter === f 
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {filtered.map((s, i) => (
          <div key={i} onClick={() => onSelectAsset(s)} className="glass rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/30 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-light text-zinc-900 dark:text-white font-serif font-mono">{s.ticker}</span>
                  <SignalBadge signal={s.signal} />
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{s.name}</div>
                {s.rationale && (
                  <div className="mt-3 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 flex items-start gap-2 max-w-md">
                    <BrainCircuit size={14} className="shrink-0 mt-0.5 text-brand-500" />
                    <span className="leading-relaxed">{s.rationale}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <MiniSparkline up={s.change > 0} />
                <div className="text-right">
                  <div className="text-base font-medium text-zinc-900 dark:text-white">{s.price}</div>
                  <div className={cn("text-xs font-bold flex items-center justify-end gap-0.5", s.change > 0 ? "text-emerald-600" : "text-rose-600")}>
                    {s.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(s.change)}%
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Força IA", value: `${s.strength}%`, color: s.strength > 70 ? "text-emerald-500" : s.strength < 40 ? "text-rose-500" : "text-brand-500" },
                { label: "RSI (14)", value: s.rsi, color: s.rsi > 65 ? "text-rose-500" : s.rsi < 35 ? "text-emerald-500" : "" },
                { label: "MACD", value: s.macd },
                { label: "Sentimento", value: `${s.sentiment}%`, color: s.sentiment > 60 ? "text-emerald-500" : "text-rose-500" },
              ].map((m, j) => (
                <div key={j} className="text-center">
                  <div className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-1">{m.label}</div>
                  <div className={cn("text-sm font-bold", m.color || "text-zinc-700 dark:text-zinc-300")}>{m.value}</div>
                </div>
              ))}
            </div>
            <StrengthBar value={s.strength} signal={s.signal} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScannerScreen() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const criteria = [
    { label: "RSI abaixo de 40 (Sobrevenda)", active: true },
    { label: "Cruzamento MACD de alta", active: true },
    { label: "Volume acima da média 20d", active: false },
    { label: "Preço acima da MM200", active: true },
    { label: "Sentimento positivo > 65%", active: false },
    { label: "P/L abaixo da média setorial", active: true },
  ];

  const runScan = () => {
    setScanning(true);
    setProgress(0);
    setResults([]);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(iv);
          setScanning(false);
          setResults([
            { ticker: "WEGE3", match: 4, score: 91 },
            { ticker: "SUZB3", match: 4, score: 84 },
            { ticker: "RENT3", match: 3, score: 76 },
          ]);
          return 100;
        }
        return p + 5;
      });
    }, 80);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Search size={14} className="text-brand-500" /> Critérios de Varredura
        </h3>
        <div className="space-y-2">
          {criteria.map((c, i) => (
            <div key={i} className={cn(
              "glass rounded-xl p-3 flex items-center justify-between border transition-all",
              c.active ? "border-brand-500/20" : "border-zinc-200 dark:border-zinc-800"
            )}>
              <span className={cn("text-xs font-medium", c.active ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500")}>{c.label}</span>
              <div className={cn(
                "w-8 h-4 rounded-full p-0.5 transition-colors",
                c.active ? "bg-brand-500" : "bg-zinc-200 dark:bg-zinc-700"
              )}>
                <div className={cn(
                  "w-3 h-3 bg-white rounded-full transition-transform",
                  c.active ? "translate-x-4" : "translate-x-0"
                )} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={runScan} 
        disabled={scanning} 
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95",
          scanning 
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed" 
            : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-lg"
        )}
      >
        {scanning ? `Varrendo mercado... ${progress}%` : "◈ Iniciar Varredura"}
      </button>

      {scanning && (
        <div className="glass rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-100" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-3 text-center font-medium">
            Analisando 423 ativos do IBOVESPA, Small Caps e FIIs...
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <TrendingUp size={14} /> ✓ {results.length} Ativos Encontrados
          </h3>
          {results.map((r, i) => (
            <div key={i} className="glass rounded-2xl p-4 border border-emerald-500/20 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
              <div className="flex items-center justify-between">
                <span className="text-xl font-light text-zinc-900 dark:text-white font-serif font-mono">{r.ticker}</span>
                <span className="text-sm font-bold text-emerald-600">Score: {r.score}</span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                {r.match} de 4 critérios atendidos
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SentimentScreen() {
  const gaugeValue = 68;
  return (
    <div className="space-y-6">
      {/* Gauge */}
      <div className="glass rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 text-center">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-6">◎ Índice de Sentimento do Mercado</h3>
        <div className="relative inline-flex flex-col items-center">
          <svg width="200" height="110" viewBox="0 0 160 85">
            <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="10" strokeLinecap="round" />
            <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none"
              stroke="url(#gauge-grad)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(gaugeValue / 100) * 204} 204`} />
            <defs>
              <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute bottom-2">
            <div className="text-4xl font-black text-emerald-500 tracking-tighter">{gaugeValue}</div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">OTIMISTA</div>
          </div>
        </div>
        <div className="flex justify-between mt-4 px-4">
          <span className="text-[9px] font-bold text-rose-500 uppercase">Pessimista</span>
          <span className="text-[9px] font-bold text-brand-500 uppercase">Neutro</span>
          <span className="text-[9px] font-bold text-emerald-500 uppercase">Otimista</span>
        </div>
      </div>

      {/* Fontes */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Redes Sociais", score: 72, icon: <Zap size={12} /> },
          { label: "Notícias", score: 64, icon: <BarChart3 size={12} /> },
          { label: "Opções (Put/Call)", score: 58, icon: <Radar size={12} /> },
          { label: "Fluxo Estrangeiro", score: 71, icon: <TrendingUp size={12} /> },
        ].map((src, i) => (
          <div key={i} className="glass rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-2">
              {src.icon} {src.label}
            </div>
            <div className={cn("text-2xl font-bold", src.score > 60 ? "text-emerald-500" : "text-rose-500")}>{src.score}</div>
            <div className="mt-3 h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={cn("h-full", src.score > 60 ? "bg-emerald-500" : "bg-rose-500")} 
                style={{ width: `${src.score}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Últimas Notícias */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Últimas Notícias Relevantes</h3>
        <div className="space-y-3">
          {SENTIMENT_NEWS.map((n, i) => (
            <div key={i} className={cn(
              "glass rounded-2xl p-4 border relative overflow-hidden",
              n.impact === "positivo" ? "border-emerald-500/20" : n.impact === "negativo" ? "border-rose-500/20" : "border-zinc-200 dark:border-zinc-800"
            )}>
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                n.impact === "positivo" ? "bg-emerald-500" : n.impact === "negativo" ? "bg-rose-500" : "bg-brand-500"
              )} />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">{n.source}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                  <Clock size={10} /> {n.time} atrás
                </span>
              </div>
              <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{n.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WatchlistScreen({ signals }: { signals: any[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (items.length === 0) {
      setItems(signals.slice(0, 4).map(s => ({ ...s, alerted: s.ticker === "PETR4" || s.ticker === "WEGE3" })));
    } else {
      // Update existing items with new prices/changes from signals
      setItems(prev => prev.map(item => {
        const live = signals.find(s => s.ticker === item.ticker);
        if (live) {
          return { ...item, price: live.price, change: live.change };
        }
        return item;
      }));
    }
  }, [signals]);

  const toggleAlert = (i: number) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, alerted: !it.alerted } : it));
  };
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleAdd = () => {
    const ticker = input.toUpperCase().trim();
    if (!ticker) return;
    setItems(prev => [...prev, {
      ticker, name: ticker, price: "—", change: 0,
      signal: "NEUTRO", strength: 50, sector: "—", alerted: false,
    }]);
    setInput("");
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light text-zinc-900 dark:text-white font-serif">Minha Watchlist</h2>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{items.length} ativos monitorados</p>
        </div>
        <button 
          onClick={() => setAdding(a => !a)} 
          className="rounded-xl bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-900 shadow-lg active:scale-95 transition-all"
        >
          + Adicionar
        </button>
      </div>

      {/* Add input */}
      {adding && (
        <div className="glass rounded-2xl p-3 border border-brand-500/30 flex gap-2 animate-in fade-in slide-in-from-top-2">
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Ex: VALE3, ITUB4..."
            className="flex-1 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          <button 
            onClick={handleAdd} 
            className="bg-brand-500 text-white rounded-xl px-4 py-2 text-xs font-bold hover:bg-brand-600 transition-colors"
          >
            OK
          </button>
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
          Ative o sino para receber alertas instantâneos quando o sinal de um ativo monitorado mudar.
        </p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="glass rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1",
              item.signal === "COMPRA" ? "bg-emerald-500" : item.signal === "VENDA" ? "bg-rose-500" : "bg-brand-500"
            )} />
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-light text-zinc-900 dark:text-white font-serif font-mono">{item.ticker}</span>
                  <SignalBadge signal={item.signal} />
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{item.name} · {item.sector}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-base font-medium text-zinc-900 dark:text-white">{item.price}</div>
                  <div className={cn(
                    "text-xs font-bold flex items-center justify-end gap-0.5", 
                    item.change > 0 ? "text-emerald-600" : item.change < 0 ? "text-rose-600" : "text-zinc-400"
                  )}>
                    {item.change > 0 ? <TrendingUp size={12} /> : item.change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {item.change !== 0 ? Math.abs(item.change) + "%" : "0.0%"}
                  </div>
                </div>
                <button 
                  onClick={() => toggleAlert(i)} 
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                    item.alerted 
                      ? "bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-900/30 dark:border-brand-800 dark:text-brand-400" 
                      : "bg-zinc-50 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-600"
                  )}
                >
                  {item.alerted ? <Bell size={18} fill="currentColor" /> : <BellOff size={18} />}
                </button>
                <button 
                  onClick={() => removeItem(i)} 
                  className="text-zinc-300 hover:text-rose-500 transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Força do Sinal</span>
                <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300">{item.strength}%</span>
              </div>
              <StrengthBar value={item.strength} signal={item.signal} />
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 px-6">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star size={32} className="text-zinc-300 dark:text-zinc-700" />
          </div>
          <h3 className="text-base font-medium text-zinc-900 dark:text-white">Sua watchlist está vazia</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Adicione ativos para monitorar sinais e receber alertas em tempo real.</p>
        </div>
      )}
    </div>
  );
}

export default function Investments() {
  const [activeTab, setActiveTab] = useState("radar");
  const [signals, setSignals] = useState<any[]>(INITIAL_SIGNALS);
  const [marketRegion, setMarketRegion] = useState<'ALL' | 'BR' | 'US'>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isAnalyzingSignals, setIsAnalyzingSignals] = useState(false);
  const hasRunAI = React.useRef(false);

  const visibleSignals = marketRegion === 'ALL'
    ? signals
    : signals.filter((s: any) => regionOf(s.symbol, s.region) === marketRegion);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await axios.get('/api/market-data');
        if (!Array.isArray(response.data)) {
          throw new Error('Invalid data format');
        }
        
        const newSignals = response.data
          .map((item: any) => {
            const existing = INITIAL_SIGNALS.find(s => s.symbol === item.symbol);
            const change = typeof item.change === 'number' ? item.change : 0;
            const region = regionOf(item.symbol, item.region);

            const ticker = tickerLabel(item.symbol);

            // Generate dynamic signal if not in INITIAL_SIGNALS
            const signal = existing ? existing.signal : (change > 1 ? 'COMPRA' : change < -1 ? 'VENDA' : 'NEUTRO');
            const strength = existing ? existing.strength : Math.round(Math.min(100, Math.max(0, 50 + change * 10)));
            const rsi = existing ? existing.rsi : Math.round(Math.min(100, Math.max(0, 50 + change * 5)));
            const macd = existing ? existing.macd : (change > 0 ? "↑" : change < 0 ? "↓" : "→");
            const sentiment = existing ? existing.sentiment : Math.round(Math.min(100, Math.max(0, 50 + change * 8)));

            return {
              ticker,
              symbol: item.symbol,
              name: item.name || item.symbol,
              region,
              currency: item.currency,
              signal,
              strength,
              price: formatAssetPrice(typeof item.price === 'number' ? item.price : 0, item.currency, region),
              change,
              rsi,
              macd,
              sentiment,
              sector: existing ? existing.sector : (item.symbol === 'BTC-USD' ? 'Cripto' : item.symbol === 'USDBRL=X' ? 'Câmbio' : region === 'US' ? 'EUA' : 'Diversos'),
              rationale: "Analisando mercado..."
            };
          });
          
        if (newSignals.length > 0) {
          setSignals(prevSignals => {
            // Preserve AI rationale and signals if they exist
            return newSignals.map(newSig => {
              const prevSig = prevSignals.find(p => p.symbol === newSig.symbol) as any;
              if (prevSig && prevSig.rationale && prevSig.rationale !== "Analisando mercado...") {
                return { ...newSig, signal: prevSig.signal, strength: prevSig.strength, rationale: prevSig.rationale };
              }
              return newSig;
            });
          });
        }

        if (!hasRunAI.current && response.data.length > 0) {
          hasRunAI.current = true;
          setIsAnalyzingSignals(true);
          try {
            const aiEvaluations = await generateBatchSignals(response.data);
            setSignals(prev => prev.map(sig => {
              const aiEval = aiEvaluations.find(a => a.symbol === sig.symbol);
              if (aiEval) {
                return { ...sig, signal: aiEval.signal, strength: aiEval.strength, rationale: aiEval.rationale };
              }
              return sig;
            }));
          } catch (e) {
            console.error("AI evaluation failed", e);
          } finally {
            setIsAnalyzingSignals(false);
          }
        }

      } catch (error) {
        console.error('Error fetching market data for signals:', error);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: "radar", label: "Radar", icon: Radar, component: <RadarScreen signals={visibleSignals} onSelectAsset={setSelectedAsset} isAnalyzing={isAnalyzingSignals} /> },
    { id: "signals", label: "Sinais", icon: Zap, component: <SignalsScreen signals={visibleSignals} onSelectAsset={setSelectedAsset} isAnalyzing={isAnalyzingSignals} /> },
    { id: "scanner", label: "Scanner", icon: Search, component: <ScannerScreen /> },
    { id: "watchlist", label: "Watchlist", icon: Star, component: <WatchlistScreen signals={visibleSignals} /> },
    { id: "sentiment", label: "Sentimento", icon: BarChart3, component: <SentimentScreen /> },
  ];

  const REGION_TABS: { id: 'ALL' | 'BR' | 'US'; label: string }[] = [
    { id: 'ALL', label: '🌎 Todos' },
    { id: 'BR', label: '🇧🇷 Brasil' },
    { id: 'US', label: '🇺🇸 EUA' },
  ];

  return (
    <div className="pb-24">
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Info className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Aviso Legal Importante</h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1 leading-relaxed">
                As análises, sinais e informações apresentadas nesta página são geradas por algoritmos de inteligência artificial apenas para fins educacionais e informativos. <strong>NÃO constituem recomendação de compra, venda ou manutenção de ativos.</strong> Todo investimento envolve riscos e você deve tomar suas próprias decisões.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gold-gradient-bg flex items-center justify-center text-white shadow-lg shadow-brand-200 dark:shadow-none">
                <Zap size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Investimentos<span className="gold-gradient">.ai</span></h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Mercado Aberto</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors">
                <Bell size={20} />
              </button>
              <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 overflow-hidden">
                <img src="https://picsum.photos/seed/user/100/100" alt="User" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="max-w-3xl mx-auto">
          {/* Seletor de mercado: Brasil / EUA */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
              {REGION_TABS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setMarketRegion(r.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    marketRegion === r.id
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {visibleSignals.length} ativos
            </span>
          </div>
          {tabs.find(t => t.id === activeTab)?.component}
        </div>
      </div>

      {selectedAsset && (
        <AssetDetailsModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}

      {/* Bottom Navigation (Floating) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50">
        <div className="glass rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-2 flex items-center justify-between">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                activeTab === tab.id 
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <tab.icon size={20} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
