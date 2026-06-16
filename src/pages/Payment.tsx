import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getPlan, formatBRL } from '../constants/plans';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, loading, refreshUser } = useAuth();

  const plan = getPlan(searchParams.get('plan'));

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Proteção da rota: se não estiver logado, manda para o login e volta depois
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', {
        state: { redirectTo: location.pathname + location.search },
        replace: true,
      });
    }
  }, [loading, user, navigate, location]);

  if (!plan) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <h2 className="text-3xl font-light font-serif text-zinc-900 dark:text-white">
          Plano não encontrado
        </h2>
        <Link
          to="/plans"
          className="rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
        >
          Ver planos disponíveis
        </Link>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: plan.id, cardNumber, cardName, expiry, cvv }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao processar pagamento.');
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao processar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-[2.5rem] border border-zinc-200/60 bg-white/60 p-12 text-center shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="text-emerald-500" size={44} />
          </div>
          <h2 className="mt-8 text-3xl font-light font-serif text-zinc-900 dark:text-white">
            Pagamento aprovado!
          </h2>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Seu plano <span className="font-semibold gold-gradient">{plan.name}</span> já está
            ativo. Aproveite todos os novos recursos e limites.
          </p>
          <Link
            to="/dashboard"
            className="group mt-10 flex w-full items-center justify-center gap-2 rounded-full gold-gradient-bg py-3.5 text-sm font-semibold uppercase tracking-widest shadow-xl shadow-brand-500/25 transition-all hover:opacity-90 active:scale-95"
          >
            Ir para o Dashboard
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-sm focus:ring-brand-500/50 dark:border-zinc-800/50 dark:bg-zinc-950/80 dark:text-zinc-200 dark:placeholder:text-zinc-600';

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-center text-4xl font-light font-serif tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
          Finalizar <span className="gold-gradient font-medium">assinatura</span>
        </h1>
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Você está assinando como <span className="font-semibold">{user.email}</span>
        </p>

        <div className="mt-14 grid gap-8 lg:grid-cols-5">
          {/* Resumo do pedido */}
          <div className="lg:col-span-2">
            <div className="rounded-[2rem] border border-zinc-200/60 bg-white/50 p-8 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/40">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Resumo do pedido
              </h3>
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white font-heading">
                    Plano {plan.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Cobrança mensal recorrente
                  </p>
                </div>
                <p className="text-2xl font-bold gold-gradient">{formatBRL(plan.price)}</p>
              </div>

              <div className="my-6 border-t border-zinc-200/60 dark:border-zinc-800/50" />

              <ul className="space-y-2.5">
                {plan.features.slice(0, 5).map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="my-6 border-t border-zinc-200/60 dark:border-zinc-800/50" />

              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">Total hoje</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {formatBRL(plan.price)}
                </span>
              </div>

              <Link
                to="/plans"
                className="mt-6 block text-center text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                Trocar de plano
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
              <ShieldCheck size={14} />
              Ambiente de pagamento simulado para demonstração
            </div>
          </div>

          {/* Formulário de pagamento */}
          <div className="lg:col-span-3">
            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-zinc-200/60 bg-white/50 p-8 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gold-gradient-bg shadow-lg shadow-brand-500/20">
                  <CreditCard size={18} />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-heading">
                  Dados do cartão
                </h3>
              </div>

              {error && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                    Número do cartão
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className={inputClass}
                    placeholder="0000 0000 0000 0000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="ml-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                    Nome impresso no cartão
                  </label>
                  <input
                    type="text"
                    autoComplete="cc-name"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className={inputClass}
                    placeholder="JOÃO M SILVA"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="ml-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                      Validade
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      className={inputClass}
                      placeholder="MM/AA"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ml-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                      CVV
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      required
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className={inputClass}
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'mt-8 flex w-full items-center justify-center gap-2 rounded-full gold-gradient-bg py-4 text-sm font-semibold uppercase tracking-widest shadow-xl shadow-brand-500/25 transition-all hover:opacity-90 active:scale-95',
                  submitting && 'opacity-60'
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Pagar {formatBRL(plan.price)}
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                Pagamento simulado — nenhum valor real será cobrado.
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
