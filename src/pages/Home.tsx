import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wallet, PieChart, Zap, Search, BarChart3, TrendingUp, Star, Radar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Premium Background elements */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-brand-200/20 blur-[100px] dark:bg-brand-900/10" />
      <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-zinc-200/30 blur-[120px] dark:bg-zinc-800/20" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-brand-300/10 blur-[100px] dark:bg-brand-800/10" />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-32 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-5 py-2 text-xs font-bold uppercase tracking-widest text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-400 dark:ring-zinc-800">
              Wealth Management & AI
            </span>
            <h1 className="mt-10 text-5xl font-light tracking-tight text-zinc-900 dark:text-white sm:text-7xl font-serif leading-tight">
              Domine seu <span className="italic text-zinc-500 dark:text-zinc-400">patrimônio</span>.<br />
              Potencialize seu <span className="gold-gradient font-medium">futuro</span>.
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400 font-light">
              GastoClaro une a exclusividade da gestão de fortunas com a precisão da inteligência artificial. Categorize gastos automaticamente e receba sinais de investimento institucionais em tempo real.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/dashboard"
                className="group w-full sm:w-auto flex items-center justify-center gap-3 rounded-full bg-zinc-900 px-8 py-4 text-sm font-medium uppercase tracking-widest text-white shadow-2xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-zinc-900/40 active:scale-95 dark:bg-white dark:text-zinc-900 dark:shadow-white/10 dark:hover:bg-zinc-100"
              >
                Acessar Dashboard
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/investments"
                className="group w-full sm:w-auto flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-medium uppercase tracking-widest text-zinc-900 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 hover:shadow-zinc-200 active:scale-95 dark:bg-zinc-900 dark:text-white dark:shadow-none dark:ring-zinc-800 dark:hover:bg-zinc-800"
              >
                Explorar Ativos
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="mt-24 rounded-[2.5rem] border border-zinc-200/50 bg-white/40 p-4 shadow-2xl shadow-zinc-200/50 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:shadow-black/50"
          >
            <div className="rounded-[2rem] bg-zinc-50/80 p-10 text-left dark:bg-[#09090b]/80 backdrop-blur-md border border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <div className="grid md:grid-cols-2 gap-12 font-mono text-sm">
                <div className="space-y-5">
                  <p className="text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-xs font-bold">Gestão Inteligente</p>
                  <p className="text-zinc-800 dark:text-zinc-300 text-lg">"Jantar no Fasano 850, Uber Black 120"</p>
                  <div className="rounded-2xl bg-white p-6 border border-zinc-200/50 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800/50">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Processado</span>
                      <span className="text-2xl font-light text-zinc-900 dark:text-white">R$ 970,00</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-5">
                  <p className="gold-gradient uppercase tracking-widest text-xs font-bold">Sinais Institucionais</p>
                  <p className="text-zinc-800 dark:text-zinc-300 text-lg">"Analisando tendências do IBOVESPA..."</p>
                  <div className="rounded-2xl bg-white p-6 border border-brand-500/20 shadow-sm dark:bg-zinc-900/50 dark:border-brand-500/20 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 gold-gradient-bg" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-900 dark:text-white text-xl">PETR4</span>
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 uppercase tracking-widest">Forte Compra</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-40">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-light text-zinc-900 dark:text-white font-serif">Exclusividade em cada detalhe</h2>
            <p className="mt-6 text-zinc-500 dark:text-zinc-400 font-light text-lg">Ferramentas de alto padrão para investidores exigentes.</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Concierge Financeiro', desc: 'Registre gastos com linguagem natural. Nossa IA categoriza tudo com precisão absoluta.', icon: Wallet },
              { title: 'Radar Premium', desc: 'Acompanhe ativos globais com algoritmos de força relativa e momentum.', icon: Radar },
              { title: 'Filtros Avançados', desc: 'Scanner de mercado com critérios técnicos e fundamentalistas em tempo real.', icon: Search },
              { title: 'Termômetro Social', desc: 'Análise de sentimento baseada em notícias e fluxo de mercado institucional.', icon: BarChart3 },
              { title: 'Insights Exclusivos', desc: 'Relatórios gerados por IA para otimização de portfólio e redução de custos.', icon: Zap },
              { title: 'Monitoramento VIP', desc: 'Alertas personalizados de preço e mudança de tendência para seus ativos.', icon: Star },
            ].map((feature, i) => (
              <div key={i} className="group relative rounded-[2rem] border border-zinc-200/50 bg-white/50 p-10 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/50 dark:border-zinc-800/50 dark:bg-zinc-900/30 dark:hover:shadow-black/50">
                <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 transition-colors group-hover:gold-gradient-bg group-hover:text-white dark:bg-zinc-800 dark:text-white">
                  <feature.icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-medium text-zinc-900 dark:text-white font-heading">{feature.title}</h3>
                <p className="mt-4 text-zinc-500 leading-relaxed dark:text-zinc-400 font-light">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-40 rounded-[3rem] bg-zinc-900 p-16 text-center text-white dark:bg-white dark:text-zinc-900 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-zinc-500 rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl font-light sm:text-5xl font-serif">Eleve seu padrão financeiro.</h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 dark:text-zinc-500 font-light">
              Faça parte do seleto grupo de investidores que utilizam inteligência artificial para maximizar retornos e proteger patrimônio.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/register"
                className="w-full sm:w-auto rounded-full bg-white px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-900 transition-all hover:bg-zinc-100 hover:shadow-xl hover:shadow-white/20 active:scale-95 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 dark:hover:shadow-zinc-900/20"
              >
                Solicitar Acesso
              </Link>
              <Link
                to="/investments"
                className="w-full sm:w-auto rounded-full border border-zinc-700 px-10 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-800 active:scale-95 dark:border-zinc-300 dark:text-zinc-900 dark:hover:bg-zinc-50"
              >
                Ver Portfólio
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
