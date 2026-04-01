import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function Register() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] border border-white/20 bg-white/50 p-10 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50/50 dark:bg-zinc-900/50">
        <div className="text-center">
          <h2 className="text-4xl font-light font-serif tracking-tight text-zinc-900 dark:text-white">Criar conta</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Comece a organizar suas finanças hoje mesmo
          </p>
        </div>
        
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase ml-1 dark:text-zinc-400">Nome completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input type="text" className="w-full rounded-xl border-white/20 bg-white/80 pl-10 py-3 text-sm focus:ring-brand-500/50 dark:border-zinc-800/50 dark:bg-zinc-950/80 dark:text-zinc-200 dark:placeholder:text-zinc-600" placeholder="João Silva" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase ml-1 dark:text-zinc-400">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input type="email" className="w-full rounded-xl border-white/20 bg-white/80 pl-10 py-3 text-sm focus:ring-brand-500/50 dark:border-zinc-800/50 dark:bg-zinc-950/80 dark:text-zinc-200 dark:placeholder:text-zinc-600" placeholder="seu@email.com" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase ml-1 dark:text-zinc-400">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input type="password" className="w-full rounded-xl border-white/20 bg-white/80 pl-10 py-3 text-sm focus:ring-brand-500/50 dark:border-zinc-800/50 dark:bg-zinc-950/80 dark:text-zinc-200 dark:placeholder:text-zinc-600" placeholder="••••••••" />
            </div>
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
            Criar conta
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
