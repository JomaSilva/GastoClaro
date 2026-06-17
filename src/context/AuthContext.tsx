import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  banned?: boolean;
  authProvider?: string;
  emailVerified?: boolean;
  createdAt: string;
}

export class ApiError extends Error {
  readonly code?: string;
  readonly email?: string;
  constructor(message: string, code?: string, email?: string) {
    super(message);
    this.code = code;
    this.email = email;
  }
}

export interface AppConfig {
  googleClientId: string | null;
  stripeEnabled: boolean;
}

export interface RegisterResult {
  user?: AuthUser;
  needsVerification?: boolean;
  email?: string;
  devLink?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  config: AppConfig;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (credential: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  resendVerification: (email: string) => Promise<{ devLink?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'gastoclaro_token';
// Cache de conveniência do último relatório do Dashboard (por sessão de login).
const DASHBOARD_CACHE_KEY = 'last_report';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      (data.error as string) || 'Erro inesperado. Tente novamente.',
      data.code as string | undefined,
      data.email as string | undefined,
    );
  }
  return data as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppConfig>({ googleClientId: null, stripeEnabled: false });

  useEffect(() => {
    api<AppConfig>('/api/auth/config')
      .then(setConfig)
      .catch(() => setConfig({ googleClientId: null, stripeEnabled: false }));
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ user: AuthUser }>('/api/auth/me', {
        headers: { Authorization: `Bearer ${stored}` },
      });
      setUser(data.user);
      setToken(stored);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleAuth = (data: { token: string; user: AuthUser }) => {
    // Ao entrar em qualquer conta, descarta cache de Dashboard de uma sessão anterior
    // (evita que outra conta veja o relatório do usuário anterior neste navegador).
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return handleAuth(data);
  };

  const loginWithGoogle = async (credential: string) => {
    const data = await api<{ token: string; user: AuthUser }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    return handleAuth(data);
  };

  const register = async (name: string, email: string, password: string): Promise<RegisterResult> => {
    const data = await api<{ needsVerification?: boolean; email?: string; devLink?: string; token?: string; user?: AuthUser }>(
      '/api/auth/register',
      { method: 'POST', body: JSON.stringify({ name, email, password }) }
    );
    if (data.needsVerification) {
      return { needsVerification: true, email: data.email, devLink: data.devLink };
    }
    if (data.token && data.user) {
      const user = handleAuth(data as { token: string; user: AuthUser });
      return { user };
    }
    return {};
  };

  const resendVerification = async (email: string): Promise<{ devLink?: string }> => {
    const data = await api<{ ok: boolean; devLink?: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return { devLink: data.devLink };
  };

  const logout = async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${stored}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, config, login, loginWithGoogle, register, resendVerification, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
