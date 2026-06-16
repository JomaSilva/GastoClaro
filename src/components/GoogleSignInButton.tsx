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

  // Sem Client ID configurado, o recurso some silenciosamente.
  if (!config.googleClientId) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
