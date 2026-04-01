import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, RefreshCw, TrendingUp, AlertCircle, Image as ImageIcon, X, Upload, Download, FileSpreadsheet, Check, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { processExpenses } from '../services/gemini';
import { SIGNALS } from '../constants/investments';
import { ExpenseReport } from '../types';
import { ExpenseTable } from '../components/ExpenseTable';
import { ExpenseCharts } from '../components/ExpenseCharts';
import { InsightCards } from '../components/InsightCards';
import { formatCurrency, fileToBase64 } from '../lib/utils';
import { downloadCSV, copyToGoogleSheets } from '../lib/exportUtils';

export default function Dashboard() {
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<{ id: string, file: File, preview: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('last_report');
    if (saved) {
      try {
        setReport(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved report", e);
      }
    }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: { id: string, file: File, preview: string }[] = [];
      
      Array.from(files).forEach((file: File) => {
        if (file.size > 4 * 1024 * 1024) {
          setError(`A imagem ${file.name} excede o limite de 4MB.`);
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              file,
              preview: reader.result as string
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleProcess = async () => {
    if (!inputText.trim() && selectedImages.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const imagesData = await Promise.all(
        selectedImages.map(async (img) => ({
          data: await fileToBase64(img.file),
          mimeType: img.file.type
        }))
      );

      const result = await processExpenses(inputText, imagesData);
      setReport(result);
      localStorage.setItem('last_report', JSON.stringify(result));
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao processar seus gastos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setReport(null);
    setInputText('');
    setSelectedImages([]);
    localStorage.removeItem('last_report');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <AnimatePresence mode="wait">
        {!report ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-auto max-w-3xl"
          >
            <div className="text-center mb-10">
              <h1 className="text-4xl font-light text-zinc-900 dark:text-white font-serif tracking-tight">O que você gastou hoje?</h1>
              <p className="mt-3 text-zinc-500 dark:text-zinc-400 font-light tracking-wide">Digite seus gastos ou envie imagens das suas faturas/extratos.</p>
            </div>

            <div className="rounded-[2rem] border border-white/20 bg-white/50 p-8 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder='Ex: "Uber 35, mercado 220..." ou anexe imagens abaixo'
                  className="h-40 w-full resize-none rounded-2xl border-none bg-white/80 p-6 text-lg font-light text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-500/50 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-600 shadow-inner transition-all"
                />
                
                {selectedImages.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3 p-2">
                    {selectedImages.map((img) => (
                      <div key={img.id} className="relative group">
                        <img src={img.preview} alt="Preview" className="h-16 w-16 rounded-xl object-cover border border-zinc-200 shadow-sm dark:border-zinc-800" />
                        <button 
                          onClick={() => removeImage(img.id)}
                          className="absolute -top-2 -right-2 rounded-full bg-white p-1 text-zinc-500 shadow-md hover:bg-red-50 hover:text-red-500 transition-colors border border-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-full border border-zinc-200/50 bg-white/80 px-5 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-white active:scale-95 dark:border-zinc-700/50 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700 shadow-sm"
                  >
                    <ImageIcon size={18} className="text-brand-500" />
                    Anexar Faturas
                  </button>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 font-light">
                    <AlertCircle size={14} />
                    <span>Múltiplos arquivos</span>
                  </div>
                </div>

                <button
                  onClick={handleProcess}
                  disabled={isLoading || (!inputText.trim() && selectedImages.length === 0)}
                  className="flex items-center justify-center gap-2 rounded-full gold-gradient-bg px-8 py-3 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-brand-500/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      Analisar Gastos
                      <Send size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl bg-red-50 p-4 text-center text-sm font-medium text-red-600 border border-red-100">
                {error}
              </div>
            )}

            {/* Investment Radar Summary */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Zap size={16} className="text-brand-500" /> Radar de Investimentos
                </h2>
                <Link to="/investments" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  Ver Radar Completo <ArrowRight size={12} />
                </Link>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                {SIGNALS.filter(s => s.signal === 'COMPRA').slice(0, 3).map((s, i) => (
                  <Link key={i} to="/investments" className="glass rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-zinc-900 dark:text-white">{s.ticker}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {s.strength}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{s.price}</span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                        <TrendingUp size={12} /> {s.change}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-4xl font-light text-zinc-900 dark:text-white font-serif tracking-tight">Análise de Gastos</h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-light mt-2 tracking-wide">Referente a {report.monthReference}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => downloadCSV(report)}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/50 px-5 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-white active:scale-95 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-700 shadow-sm backdrop-blur-md"
                  title="Baixar planilha CSV"
                >
                  <Download size={18} strokeWidth={1.5} />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={async () => {
                    const success = await copyToGoogleSheets(report);
                    if (success) {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/50 px-5 py-2.5 text-sm font-medium text-emerald-600 transition-all hover:bg-emerald-50 active:scale-95 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 shadow-sm backdrop-blur-md"
                  title="Copiar para colar no Google Sheets"
                >
                  {copied ? <Check size={18} strokeWidth={1.5} /> : <FileSpreadsheet size={18} strokeWidth={1.5} />}
                  <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar p/ Planilha'}</span>
                </button>
                <div className="h-10 w-px bg-zinc-200/50 mx-1 hidden sm:block dark:bg-zinc-800/50"></div>
                <button
                  onClick={() => setReport(null)}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/50 px-5 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-white active:scale-95 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-700 shadow-sm backdrop-blur-md"
                >
                  <RefreshCw size={18} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-lg"
                >
                  Novo Relatório
                </button>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[2rem] border border-white/20 bg-white/50 p-8 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest dark:text-zinc-500">Total Geral</p>
                <p className="mt-3 text-4xl font-light text-zinc-900 dark:text-white">{formatCurrency(report.total_amount)}</p>
              </div>
              <div className="rounded-[2rem] border border-white/20 bg-white/50 p-8 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest dark:text-zinc-500">Maior Categoria</p>
                <p className="mt-3 text-3xl font-light text-brand-600 capitalize dark:text-brand-400">{report.highest_category}</p>
              </div>
              <div className="rounded-[2rem] border border-white/20 bg-white/50 p-8 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest dark:text-zinc-500">Itens Processados</p>
                <p className="mt-3 text-4xl font-light text-zinc-900 dark:text-white">{report.categorized_items.length}</p>
              </div>
              <div className="rounded-[2rem] border border-brand-500/20 gold-gradient-bg p-8 shadow-xl shadow-brand-500/20 dark:shadow-none">
                <p className="text-xs font-bold text-white/80 uppercase tracking-widest">Status</p>
                <div className="mt-3 flex items-center gap-3 text-white">
                  <TrendingUp size={28} strokeWidth={1.5} />
                  <span className="text-2xl font-light">Analisado</span>
                </div>
              </div>
            </div>

            <ExpenseCharts data={report.category_totals} />

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-6 text-2xl font-light font-serif text-zinc-900 dark:text-white tracking-tight">Detalhamento</h2>
                <ExpenseTable items={report.categorized_items} />
              </div>
              <div className="space-y-8">
                <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-white">Inteligência</h2>
                <InsightCards insights={report.insights} recommendations={report.recommendations} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
