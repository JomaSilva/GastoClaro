import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// Tipagem mínima da API Google Identity Services (carregada via script externo).
declare global {
  interface Window {
    google?: any;
  }
}

let gsiPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiPromise = null;
      reject(new Error('Falha ao carregar o Google Sign-In.'));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
}

function GoogleGIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError?: (message: string) => void;
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const { config, loginWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  // Mantém os callbacks atualizados sem reinicializar o GIS a cada render.
  const handlersRef = useRef({ onSuccess, onError, loginWithGoogle });
  handlersRef.current = { onSuccess, onError, loginWithGoogle };

  useEffect(() => {
    const clientId = config.googleClientId;
    if (!clientId || !containerRef.current) return;

    let cancelled = false;
    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              handlersRef.current.onError?.('Não foi possível obter a credencial do Google.');
              return;
            }
            try {
              await handlersRef.current.loginWithGoogle(response.credential);
              handlersRef.current.onSuccess();
            } catch (err) {
              handlersRef.current.onError?.(
                err instanceof Error ? err.message : 'Falha ao entrar com o Google.'
              );
            }
          },
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 320,
        });
      })
      .catch(() => {
        handlersRef.current.onError?.('Não foi possível carregar o Google Sign-In.');
      });

    return () => {
      cancelled = true;
    };
  }, [config.googleClientId]);

  // Sem Client ID configurado, mostramos um botão de fallback (visível) que
  // explica como ativar, em vez de sumir silenciosamente.
  if (!config.googleClientId) {
    return (
      <button
        type="button"
        onClick={() =>
          onError?.(
            'Login com Google indisponível: defina GOOGLE_CLIENT_ID no servidor (.env.local) e reinicie.'
          )
        }
        className="flex w-full items-center justify-center gap-3 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <GoogleGIcon />
        Continuar com Google
      </button>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
