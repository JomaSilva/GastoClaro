import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth, ApiError } from '../context/AuthContext';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Link inválido. Verifique se copiou o endereço completo.');
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        if (!res.ok) {
          throw new ApiError((data.error as string) || 'Falha na verificação.');
        }
        const { token: sessionToken, user } = data as { token: string; user: unknown };
        if (sessionToken) {
          localStorage.setItem('gastoclaro_token', sessionToken);
          sessionStorage.removeItem('gc_pending_verify_email');
          sessionStorage.removeItem('gc_pending_verify_link');
          await refreshUser();
        }
        setStatus('success');
        setMessage((user as { name?: string })?.name ? `Bem-vindo, ${(user as { name: string }).name}!` : 'E-mail confirmado com sucesso!');
        // Redireciona após 2 segundos
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Falha ao verificar o e-mail.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[2.5rem] border border-white/20 bg-white/50 p-10 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50 text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <Loader2 size={48} className="animate-spin text-brand-500" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">Verificando seu e-mail…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <CheckCircle size={56} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">E-mail verificado!</h2>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">{message}</p>
              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">Redirecionando para o painel…</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <XCircle size={56} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Verificação falhou</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
            </div>
            <div className="space-y-3">
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl gold-gradient-bg py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Ir para o login
              </Link>
              <Link
                to="/register"
                className="block text-sm text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Criar uma nova conta
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
