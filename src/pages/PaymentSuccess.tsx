import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, loading, user, refreshUser } = useAuth();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'confirming' | 'ok' | 'error'>('confirming');
  const [message, setMessage] = useState<string>('');
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!sessionId) {
      navigate('/plans', { replace: true });
      return;
    }
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Não foi possível confirmar o pagamento.');
        await refreshUser();
        setMessage(data.message || 'Pagamento confirmado!');
        setStatus('ok');
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Não foi possível confirmar o pagamento.');
        setStatus('error');
      }
    })();
  }, [loading, user, sessionId, token, navigate, refreshUser]);

  if (status === 'confirming') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Loader2 className="animate-spin text-brand-500" size={36} />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Confirmando seu pagamento com segurança...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-[2.5rem] border border-zinc-200/60 bg-white/60 p-12 text-center shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50"
      >
        {status === 'ok' ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="text-emerald-500" size={44} />
            </div>
            <h2 className="mt-8 text-3xl font-light font-serif text-zinc-900 dark:text-white">
              Pagamento aprovado!
            </h2>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
            <Link
              to="/dashboard"
              className="group mt-10 flex w-full items-center justify-center gap-2 rounded-full gold-gradient-bg py-3.5 text-sm font-semibold uppercase tracking-widest shadow-xl shadow-brand-500/25 transition-all hover:opacity-90 active:scale-95"
            >
              Ir para o Dashboard
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <XCircle className="text-rose-500" size={44} />
            </div>
            <h2 className="mt-8 text-3xl font-light font-serif text-zinc-900 dark:text-white">
              Não foi possível confirmar
            </h2>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
            <Link
              to="/plans"
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 py-3.5 text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              Voltar aos planos
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
