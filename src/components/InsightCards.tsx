import React from 'react';
import { Lightbulb, TrendingDown, CheckCircle2 } from 'lucide-react';

interface InsightCardsProps {
  insights: string[];
  recommendations: string[];
}

export function InsightCards({ insights, recommendations }: InsightCardsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-[2rem] bg-white/50 p-8 border border-white/20 dark:bg-zinc-900/50 dark:border-zinc-800/50 shadow-xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3 text-brand-600 dark:text-brand-400">
          <Lightbulb size={24} strokeWidth={1.5} />
          <h3 className="font-light font-serif text-2xl tracking-tight">Insights da IA</h3>
        </div>
        <ul className="space-y-4">
          {insights.map((insight, index) => (
            <li key={index} className="flex gap-4 text-sm text-zinc-700 leading-relaxed dark:text-zinc-300 font-light">
              <TrendingDown size={18} className="shrink-0 mt-0.5 opacity-50 text-brand-500" strokeWidth={1.5} />
              {insight}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[2rem] bg-white/50 p-8 border border-white/20 dark:bg-zinc-900/50 dark:border-zinc-800/50 shadow-xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={24} strokeWidth={1.5} />
          <h3 className="font-light font-serif text-2xl tracking-tight">Recomendações</h3>
        </div>
        <ul className="space-y-4">
          {recommendations.map((rec, index) => (
            <li key={index} className="flex gap-4 text-sm text-zinc-700 leading-relaxed dark:text-zinc-300 font-light">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 mt-2 dark:bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
