import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Save,
  Trash2,
  Loader2,
  Ban,
  CheckCircle2,
  RefreshCw,
  Crown,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  banned: boolean;
  authProvider?: string;
  createdAt: string;
}

const PLAN_OPTIONS = ['free', 'standard', 'pro', 'invest'];
const ROLE_OPTIONS = ['user', 'admin'];

export default function Admin() {
  const navigate = useNavigate();
  const { user, token, loading, refreshUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: 'ok' | 'err'; msg: string } | null>(null);

  // Bloqueio de acesso: usuários comuns são redirecionados para fora.
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/', { replace: true });
    }
  }, [loading, user, navigate]);

  const authHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadUsers = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar usuários.');
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários.');
    } finally {
      setFetching(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (user?.role === 'admin' && token) {
      loadUsers();
    }
  }, [user, token, loadUsers]);

  const patchField = (id: string, field: keyof AdminUser, value: string | boolean) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  };

  const handleSave = async (target: AdminUser) => {
    setSavingId(target.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          name: target.name,
          email: target.email,
          plan: target.plan,
          role: target.role,
          banned: target.banned,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, ...data.user } : u)));
      setFeedback({ id: target.id, type: 'ok', msg: 'Salvo!' });
      // Editou a própria conta → sincroniza o contexto global (Navbar, guardas, etc.).
      if (target.id === user?.id) {
        await refreshUser();
      }
    } catch (err) {
      setFeedback({ id: target.id, type: 'err', msg: err instanceof Error ? err.message : 'Falha ao salvar.' });
      // Reverte alterações otimistas que o servidor rejeitou.
      loadUsers();
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (target: AdminUser) => {
    if (!window.confirm(`Excluir definitivamente "${target.email}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setSavingId(target.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir.');
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
    } catch (err) {
      setFeedback({ id: target.id, type: 'err', msg: err instanceof Error ? err.message : 'Falha ao excluir.' });
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/40 outline-none dark:border-zinc-800/60 dark:bg-zinc-950/80 dark:text-zinc-200';

  const bannedCount = users.filter((u) => u.banned).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gold-gradient-bg text-white shadow-lg shadow-brand-500/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-light font-serif tracking-tight text-zinc-900 dark:text-white">
              Painel <span className="gold-gradient font-medium">Administrativo</span>
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Gerencie contas, planos, papéis e banimentos.
            </p>
          </div>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 self-start rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 transition-all hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-700"
        >
          <RefreshCw size={16} className={cn(fetching && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Resumo */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Usuários', value: users.length, icon: UserIcon, color: 'text-brand-600 dark:text-brand-400' },
          { label: 'Administradores', value: adminCount, icon: Crown, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Banidos', value: bannedCount, icon: Ban, color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Ativos', value: users.length - bannedCount, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-zinc-200/60 bg-white/50 p-5 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/40"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              <kpi.icon size={12} /> {kpi.label}
            </div>
            <div className={cn('mt-2 text-3xl font-light', kpi.color)}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="mt-8 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className={cn(inputClass, 'pl-10')}
        />
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabela / cards */}
      <div className="mt-6 space-y-4">
        {fetching && users.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum usuário encontrado.
          </p>
        ) : (
          filtered.map((u) => {
            const isSelf = u.id === user.id;
            const isSaving = savingId === u.id;
            return (
              <div
                key={u.id}
                className={cn(
                  'rounded-2xl border bg-white/50 p-5 shadow-sm backdrop-blur-xl transition-all dark:bg-zinc-900/40',
                  u.banned
                    ? 'border-rose-300/60 dark:border-rose-900/50'
                    : 'border-zinc-200/60 dark:border-zinc-800/50'
                )}
              >
                <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
                  <div className="lg:col-span-3">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Nome {isSelf && <span className="text-brand-500">(você)</span>}
                    </label>
                    <input
                      value={u.name}
                      onChange={(e) => patchField(u.id, 'name', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      E-mail
                    </label>
                    <input
                      value={u.email}
                      onChange={(e) => patchField(u.id, 'email', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Plano
                    </label>
                    <select
                      value={u.plan}
                      onChange={(e) => patchField(u.id, 'plan', e.target.value)}
                      className={inputClass}
                    >
                      {PLAN_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Papel
                    </label>
                    <select
                      value={u.role}
                      onChange={(e) => patchField(u.id, 'role', e.target.value)}
                      disabled={isSelf}
                      title={isSelf ? 'Você não pode alterar seu próprio papel' : undefined}
                      className={cn(inputClass, isSelf && 'cursor-not-allowed opacity-50')}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 lg:col-span-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => patchField(u.id, 'banned', !u.banned)}
                      disabled={isSelf}
                      title={isSelf ? 'Você não pode banir a si mesmo' : u.banned ? 'Desbanir' : 'Banir'}
                      className={cn(
                        'flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40',
                        u.banned
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      )}
                    >
                      <Ban size={15} />
                      {u.banned ? 'Banido' : 'Ativo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(u)}
                      disabled={isSaving}
                      title="Salvar alterações"
                      className="flex h-10 w-10 items-center justify-center rounded-lg gold-gradient-bg text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      disabled={isSaving || isSelf}
                      title={isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir usuário'}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-rose-500 transition-all hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800 dark:hover:bg-rose-900/30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                    {u.authProvider === 'google' ? 'Conta Google' : 'Conta local'} · desde{' '}
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  {feedback?.id === u.id && (
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        feedback.type === 'ok'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {feedback.msg}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
