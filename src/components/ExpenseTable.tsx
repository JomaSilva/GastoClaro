import React from 'react';
import { ExpenseItem } from '../types';
import { formatCurrency } from '../lib/utils';

interface ExpenseTableProps {
  items: ExpenseItem[];
}

export function ExpenseTable({ items }: ExpenseTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/50 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/40 text-zinc-500 uppercase text-[10px] font-bold tracking-widest dark:bg-zinc-950/40 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-5">Descrição</th>
              <th className="px-6 py-5">Categoria</th>
              <th className="px-6 py-5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
            {items.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-white/60 dark:hover:bg-zinc-800/40">
                <td className="px-6 py-5 font-light text-zinc-700 dark:text-zinc-300">{item.description}</td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 capitalize dark:bg-brand-900/30 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/50">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-5 text-right font-light text-zinc-900 dark:text-white text-lg">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
