import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, Wallet, Gem, LogOut, User as UserIcon, ShieldCheck, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { isAdminRole } from '../constants/plans';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o menu mobile automaticamente ao trocar de página.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Dashboard e Investimentos ficam disponíveis para qualquer conta logada — o plano
  // Free testa as funcionalidades e as cotas mensais são aplicadas no servidor.
  const canUsePlatform = !!user;

  const navItems = [
    ...(canUsePlatform ? [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    // Histórico fica disponível para qualquer conta logada.
    ...(user ? [{ path: '/history', label: 'Histórico', icon: History }] : []),
    ...(canUsePlatform ? [{ path: '/investments', label: 'Investimentos', icon: Wallet }] : []),
    { path: '/plans', label: 'Planos', icon: Gem },
    // Visível apenas para administradores — usuários comuns nem veem o link.
    ...(isAdminRole(user?.role) ? [{ path: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/60 backdrop-blur-xl transition-colors duration-300 dark:border-zinc-800/50 dark:bg-[#09090b]/60">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20">
            <Wallet size={20} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-heading">
            Gasto<span className="gold-gradient">Claro</span>
          </span>
        </Link>

        <div className="hidden md:flex md:items-center md:gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-all hover:text-brand-600 dark:hover:text-brand-400",
                location.pathname === item.path
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                  <UserIcon size={16} />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white max-w-[140px] truncate">
                    {user.name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest gold-gradient">
                    {user.plan === 'free' ? 'Gratuito' : user.plan}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 transition-all hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-700"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <div className="hidden md:flex md:items-center md:gap-6">
              <Link
                to="/login"
                className="text-sm font-medium text-zinc-500 transition-colors hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/20 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:hover:shadow-white/20"
              >
                Criar conta
              </Link>
            </div>
          )}

          {/* Botão hambúrguer — apenas em telas pequenas */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Abrir menu de navegação"
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 ring-1 ring-zinc-200 transition-all hover:bg-zinc-100 active:scale-95 md:hidden dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menu de navegação mobile */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-200/60 bg-white/95 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-[#09090b]/95">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
            {user && (
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900/60">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                  <UserIcon size={16} />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{user.name.split(' ')[0]}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest gold-gradient">
                    {user.plan === 'free' ? 'Gratuito' : user.plan}
                  </p>
                </div>
              </div>
            )}

            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  location.pathname === item.path
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}

            <div className="mt-2 border-t border-zinc-200/60 pt-3 dark:border-zinc-800/60">
              {user ? (
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-600 transition-all hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Criar conta
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
