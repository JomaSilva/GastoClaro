import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, LogIn, UserPlus, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/history', label: 'Histórico', icon: History },
    { path: '/investments', label: 'Investimentos', icon: Wallet },
  ];

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

        <div className="flex items-center gap-6">
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden text-sm font-medium text-zinc-500 transition-colors hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400 sm:block"
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
      </div>
    </nav>
  );
}
