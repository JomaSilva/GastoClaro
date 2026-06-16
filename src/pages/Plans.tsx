import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Crown, Gem, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { PLANS, formatBRL, type PlanDef } from '../constants/plans';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const PLAN_ICONS = {
  standard: Sparkles,
  pro: Crown,
  invest: Gem,
} as const;

function PlanCard({ plan, index }: { plan: PlanDef; index: number }) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const Icon = PLAN_ICONS[plan.id];
  const isCurrent = user?.plan === plan.id;

  const handleSelect = () => {
    if (loading) return;
    const paymentUrl = `/payment?plan=${plan.id}`;
    if (!user) {
      // Não logado → vai para o login e, depois de entrar, volta para o pagamento
      navigate('/login', { state: { redirectTo: paymentUrl } });
    } else {
      navigate(paymentUrl);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: 'easeOut' }}
      className={cn(
        'relative flex flex-col rounded-[2rem] border p-8 backdrop-blur-xl transition-all',
        plan.highlight
          ? 'border-brand-400/60 bg-white/70 shadow-2xl shadow-brand-500/10 ring-1 ring-brand-400/30 dark:bg-zinc-900/60 lg:-translate-y-4 lg:scale-[1.03]'
          : 'border-zinc-200/60 bg-white/50 shadow-xl shadow-zinc-200/40 dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:shadow-black/30'
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gold-gradient-bg px-4 py-1 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-brand-500/30">
          Mais popular
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg',
            plan.highlight
              ? 'gold-gradient-bg shadow-brand-500/30'
              : 'bg-zinc-900 shadow-zinc-900/20 dark:bg-zinc-700'
          )}
        >
          <Icon size={20} />
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white font-heading">
          {plan.name}
        </h3>
      </div>

      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{plan.tagline}</p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {formatBRL(plan.price)}
        </span>
        <span className="text-sm font-medium text-zinc-400">/mês</span>
      </div>

      <ul className="mt-8 flex-1 space-y-3">
        {plan.features.map((feature) => {
          const isHeader = feature.startsWith('Tudo do');
          return (
            <li key={feature} className="flex items-start gap-3 text-sm">
              {!isHeader && (
                <Check
                  size={16}
                  className={cn(
                    'mt-0.5 shrink-0',
                    plan.highlight ? 'text-brand-500' : 'text-zinc-400 dark:text-zinc-500'
                  )}
                />
              )}
              <span
                className={cn(
                  isHeader
                    ? 'font-semibold text-zinc-700 dark:text-zinc-300'
                    : 'text-zinc-600 dark:text-zinc-400'
                )}
              >
                {feature}
              </span>
            </li>
          );
        })}
      </ul>

      <button
        onClick={handleSelect}
        disabled={isCurrent}
        className={cn(
          'group mt-8 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold uppercase tracking-widest transition-all active:scale-95',
          isCurrent
            ? 'cursor-default bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
            : plan.highlight
              ? 'gold-gradient-bg shadow-xl shadow-brand-500/25 hover:opacity-90'
              : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
        )}
      >
        {isCurrent ? 'Plano atual' : 'Assinar agora'}
        {!isCurrent && (
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        )}
      </button>
    </motion.div>
  );
}

export default function Plans() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-brand-200/20 blur-[120px] dark:bg-brand-900/10" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-20 pb-32 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-5 py-2 text-xs font-bold uppercase tracking-widest text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-400 dark:ring-zinc-800">
              Planos & Preços
            </span>
            <h1 className="mt-8 text-4xl font-light tracking-tight text-zinc-900 dark:text-white sm:text-6xl font-serif">
              Escolha o plano ideal para o seu{' '}
              <span className="gold-gradient font-medium">patrimônio</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-zinc-500 dark:text-zinc-400">
              Quanto maior o plano, mais limites de uso e funcionalidades exclusivas você
              desbloqueia. Cancele quando quiser.
            </p>
          </motion.div>
        </div>

        <div className="mt-20 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>

        <p className="mt-16 text-center text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Pagamento seguro • Sem fidelidade • Suporte em português
        </p>
      </main>
    </div>
  );
}
