import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { cn } from '../lib/utils';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, resendVerification } = useAuth();

  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estado pós-cadastro: aguardando verificação (persiste no sessionStorage para sobreviver ao HMR)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    () => sessionStorage.getItem('gc_pending_verify_email')
  );
  const [devLink, setDevLink] = useState<string | null>(
    () => sessionStorage.getItem('gc_pending_verify_link')
  );
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await register(name, email, password);
      if (result.needsVerification) {
        const pendingEmail = result.email || email;
        sessionStorage.setItem('gc_pending_verify_email', pendingEmail);
        setVerificationEmail(pendingEmail);
        if (result.devLink) {
          sessionStorage.setItem('gc_pending_verify_link', result.devLink);
          setDevLink(result.devLink);
        }
      } else if (result.user) {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar conta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!verificationEmail || resending) return;
    setResending(true);
    setResendSuccess(false);
    setError(null);
    try {
      const result = await resendVerification(verificationEmail);
      if (result.devLink) {
        sessionStorage.setItem('gc_pending_verify_link', result.devLink);
        setDevLink(result.devLink);
      }
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reenviar. Tente novamente.');
    } finally {
      setResending(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border-white/20 bg-white/80 pl-10 py-3 text-sm focus:ring-brand-500/50 dark:border-zinc-800/50 dark:bg-zinc-950/80 dark:text-zinc-200 dark:placeholder:text-zinc-600';

  // Tela de verificação enviada
  if (verificationEmail) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 rounded-[2.5rem] border border-white/20 bg-white/50 p-10 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gold-gradient-bg shadow-lg">
              <MailCheck size={32} className="text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-light font-serif tracking-tight text-zinc-900 dark:text-white">
              Verifique seu e-mail
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Enviamos um link de confirmação para
            </p>
            <p className="mt-1 font-semibold text-zinc-900 dark:text-white break-all">
              {verificationEmail}
            </p>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Clique no link do e-mail para ativar sua conta. O link expira em 24 horas.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-400">
              E-mail reenviado com sucesso!
            </div>
          )}

          {devLink && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                Modo desenvolvimento — sem SMTP configurado
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                Clique no link abaixo para verificar seu e-mail:
              </p>
              <a
                href={devLink}
                className="inline-block w-full text-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Verificar e-mail agora
              </a>
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resending}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
              resending && 'opacity-60'
            )}
          >
            {resending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Reenviar e-mail
          </button>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Já verificou?{' '}
            <Link
              to="/login"
              state={{ redirectTo }}
              onClick={() => {
                sessionStorage.removeItem('gc_pending_verify_email');
                sessionStorage.removeItem('gc_pending_verify_link');
              }}
              className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] border border-white/20 bg-white/50 p-10 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
        <div className="text-center">
          <h2 className="text-4xl font-light font-serif tracking-tight text-zinc-900 dark:text-white">Criar conta</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Comece a organizar suas finanças hoje mesmo
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase ml-1 dark:text-zinc-400">Nome completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="João Silva" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase ml-1 dark:text-zinc-400">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="seu@email.com" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase ml-1 dark:text-zinc-400">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
              submitting && 'opacity-60'
            )}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <>Criar conta <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              ou
            </span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <GoogleSignInButton
            onSuccess={() => navigate(redirectTo, { replace: true })}
            onError={setError}
          />
        </div>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Já tem uma conta?{' '}
          <Link
            to="/login"
            state={{ redirectTo }}
            className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
