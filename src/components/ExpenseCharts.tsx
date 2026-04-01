import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { CategoryTotal } from '../types';
import { formatCurrency } from '../lib/utils';
import { useTheme } from './ThemeProvider';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

interface ChartsProps {
  data: CategoryTotal[];
}

export function ExpenseCharts({ data }: ChartsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = data.map(item => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: item.amount
  }));

  const tooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#1e293b',
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-[2rem] border border-white/20 bg-white/50 p-8 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
        <h3 className="mb-8 text-xs font-bold text-zinc-500 uppercase tracking-widest dark:text-zinc-400">Distribuição por Categoria</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke={isDark ? '#18181b' : '#ffffff'}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={tooltipStyle}
                itemStyle={{ color: isDark ? '#f4f4f5' : '#18181b' }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/20 bg-white/50 p-8 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
        <h3 className="mb-8 text-xs font-bold text-zinc-500 uppercase tracking-widest dark:text-zinc-400">Comparativo de Valores</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                width={100}
                tick={{ fontSize: 12, fill: isDark ? '#a1a1aa' : '#71717a' }}
              />
              <Tooltip 
                cursor={{ fill: isDark ? '#27272a' : '#f4f4f5' }}
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={tooltipStyle}
                itemStyle={{ color: isDark ? '#f4f4f5' : '#18181b' }}
              />
              <Bar 
                dataKey="value" 
                fill="#d97706" 
                radius={[0, 4, 4, 0]} 
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
