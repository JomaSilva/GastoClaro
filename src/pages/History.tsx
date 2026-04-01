import React from 'react';
import { History as HistoryIcon, Search, Calendar, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function History() {
  // Mock data for history
  const history = [
    { id: '1', date: '2024-03-20', total: 585.50, items: 6, category: 'Alimentação' },
    { id: '2', date: '2024-03-15', total: 1240.00, items: 12, category: 'Moradia' },
    { id: '3', date: '2024-03-10', total: 320.00, items: 4, category: 'Transporte' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
        <div>
          <h1 className="text-4xl font-light font-serif text-zinc-900 dark:text-white tracking-tight">Histórico de Relatórios</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-light mt-2 tracking-wide">Veja suas análises passadas e acompanhe sua evolução</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} strokeWidth={1.5} />
          <input 
            type="text" 
            placeholder="Buscar relatório..." 
            className="w-full rounded-full border border-white/20 bg-white/50 pl-12 pr-4 py-3 text-sm font-light focus:ring-2 focus:ring-brand-500/50 sm:w-72 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-200 dark:placeholder:text-zinc-600 backdrop-blur-md shadow-sm transition-all outline-none"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {history.map((item) => (
          <div 
            key={item.id}
            className="group flex items-center justify-between rounded-[2rem] border border-white/20 bg-white/50 p-6 shadow-xl backdrop-blur-xl transition-all hover:border-brand-500/30 hover:shadow-2xl cursor-pointer dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-brand-500/30"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-zinc-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors dark:bg-zinc-950/80 dark:text-zinc-600 dark:group-hover:bg-brand-900/30 dark:group-hover:text-brand-400 border border-zinc-100 dark:border-zinc-800">
                <Calendar size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-medium text-zinc-900 dark:text-white">{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light mt-0.5">{item.items} itens • Maior gasto em <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.category}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest dark:text-zinc-500 mb-1">Total</p>
                <p className="text-2xl font-light text-zinc-900 dark:text-white">{formatCurrency(item.total)}</p>
              </div>
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-white/80 text-zinc-400 group-hover:bg-brand-500 group-hover:text-white transition-all dark:bg-zinc-950/80 dark:text-zinc-600 dark:group-hover:bg-brand-500 dark:group-hover:text-white border border-zinc-100 dark:border-zinc-800 group-hover:border-transparent">
                <ArrowRight size={20} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-[2.5rem] gold-gradient-bg p-12 text-center text-white shadow-2xl shadow-brand-500/20 dark:shadow-none border border-brand-400/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10">
          <h3 className="text-3xl font-light font-serif tracking-tight">Quer salvar seu histórico de verdade?</h3>
          <p className="mt-4 text-white/80 font-light text-lg max-w-xl mx-auto">Crie uma conta gratuita para persistir seus dados na nuvem e acessar de qualquer lugar com segurança.</p>
          <button className="mt-8 rounded-full bg-white px-10 py-4 font-bold text-brand-600 transition-all hover:bg-zinc-50 active:scale-95 dark:bg-zinc-950 dark:text-brand-400 dark:hover:bg-zinc-900 shadow-xl">
            Criar minha conta agora
          </button>
        </div>
      </div>
    </div>
  );
}
