import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, ArrowRight, Loader2, Trash2, X, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { ExpenseTable } from '../components/ExpenseTable';
import { ExpenseCharts } from '../components/ExpenseCharts';
import { InsightCards } from '../components/InsightCards';
import type { ExpenseReport } from '../types';

interface ReportSummary {
  id: string;
  totalAmount: number;
  highestCategory: string | null;
  itemCount: number;
  monthReference: string | null;
  createdAt: string;
}

function ReportDetailModal({
  report,
  onClose,
}: {
  report: ExpenseReport;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur-2xl dark:border-zinc-800/50 dark:bg-zinc-900/90"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-3xl font-light tracking-tight text-zinc-900 dark:text-white">
              Análise de Gastos
            </h2>
            <p className="mt-1 text-sm font-light text-zinc-500 dark:text-zinc-400">
              {report.monthReference}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-zinc-100/50 p-2.5 text-zinc-500 transition-all hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/60 bg-white/50 p-5 dark:border-zinc-800/50 dark:bg-zinc-950/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Geral</p>
            <p className="mt-2 text-2xl font-light text-zinc-900 dark:text-white">
              {formatCurrency(report.total_amount)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 bg-white/50 p-5 dark:border-zinc-800/50 dark:bg-zinc-950/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Maior Categoria</p>
            <p className="mt-2 text-2xl font-light capitalize text-brand-600 dark:text-brand-400">
              {report.highest_category}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 bg-white/50 p-5 dark:border-zinc-800/50 dark:bg-zinc-950/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Itens</p>
            <p className="mt-2 text-2xl font-light text-zinc-900 dark:text-white">
              {report.categorized_items?.length ?? 0}
            </p>
          </div>
        </div>

        {report.category_totals?.length > 0 && <ExpenseCharts data={report.category_totals} />}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="mb-4 font-serif text-xl font-light tracking-tight text-zinc-900 dark:text-white">
              Detalhamento
            </h3>
            <ExpenseTable items={report.categorized_items || []} />
          </div>
          <div className="space-y-6">
            <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-white">Inteligência</h3>
            <InsightCards
              insights={report.insights || []}
              recommendations={report.recommendations || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const { token } = useAuth();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [historyMonths, setHistoryMonths] = useState<number | 'ilimitado' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExpenseReport | null>(null);

  const authHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar histórico.');
      setReports(data.reports || []);
      setHistoryMonths(data.historyMonths ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const openReport = async (id: string) => {
    setOpeningId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao abrir relatório.');
      setDetail(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir relatório.');
    } finally {
      setOpeningId(null);
    }
  };

  const deleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir este relatório do histórico?')) return;
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error('Falha ao excluir.');
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir.');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        (r.monthReference || '').toLowerCase().includes(q) ||
        (r.highestCategory || '').toLowerCase().includes(q)
    );
  }, [reports, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl font-light tracking-tight text-zinc-900 dark:text-white">
            Histórico de Relatórios
          </h1>
          <p className="mt-2 font-light tracking-wide text-zinc-500 dark:text-zinc-400">
            Veja suas análises passadas e acompanhe sua evolução
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar relatório..."
            className="w-full rounded-full border border-white/20 bg-white/50 py-3 pl-12 pr-4 text-sm font-light outline-none transition-all focus:ring-2 focus:ring-brand-500/50 sm:w-72 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-200 dark:placeholder:text-zinc-600"
          />
        </div>
      </div>

      {historyMonths && historyMonths !== 'ilimitado' && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-zinc-200/60 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800/60 dark:bg-zinc-900/40">
          <span className="text-zinc-600 dark:text-zinc-400">
            Seu plano exibe o histórico dos <strong>últimos {historyMonths} meses</strong>.
          </span>
          <Link to="/plans" className="shrink-0 text-xs font-bold text-brand-600 hover:underline dark:text-brand-400">
            Ver planos →
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-500">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2.5rem] border border-zinc-200/60 bg-white/50 p-16 text-center dark:border-zinc-800/50 dark:bg-zinc-900/40">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <FileText size={28} className="text-zinc-400 dark:text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
            {reports.length === 0 ? 'Nenhum relatório ainda' : 'Nada encontrado'}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            {reports.length === 0
              ? 'Crie uma análise no Dashboard para começar a montar seu histórico financeiro.'
              : 'Tente outro termo de busca.'}
          </p>
          {reports.length === 0 && (
            <Link
              to="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-full gold-gradient-bg px-8 py-3 text-sm font-semibold uppercase tracking-widest shadow-lg transition-all hover:opacity-90"
            >
              Ir para o Dashboard <ArrowRight size={16} />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openReport(item.id)}
              className="group flex cursor-pointer items-center justify-between rounded-[2rem] border border-white/20 bg-white/50 p-6 shadow-xl backdrop-blur-xl transition-all hover:border-brand-500/30 hover:shadow-2xl dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-brand-500/30"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-100 bg-white/80 text-zinc-400 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-600 dark:group-hover:bg-brand-900/30 dark:group-hover:text-brand-400">
                  <Calendar size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-lg font-medium text-zinc-900 dark:text-white">
                    {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="mt-0.5 text-sm font-light text-zinc-500 dark:text-zinc-400">
                    {item.itemCount} itens
                    {item.highestCategory && (
                      <>
                        {' '}• Maior gasto em{' '}
                        <span className="font-medium capitalize text-zinc-700 dark:text-zinc-300">
                          {item.highestCategory}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Total
                  </p>
                  <p className="text-2xl font-light text-zinc-900 dark:text-white">
                    {formatCurrency(item.totalAmount)}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteReport(item.id, e)}
                  title="Excluir relatório"
                  className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:text-zinc-600 dark:hover:bg-rose-900/30"
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                </button>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-100 bg-white/80 text-zinc-400 transition-all group-hover:border-transparent group-hover:bg-brand-500 group-hover:text-white dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-600">
                  {openingId === item.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ArrowRight size={20} strokeWidth={1.5} />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {detail && <ReportDetailModal report={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
