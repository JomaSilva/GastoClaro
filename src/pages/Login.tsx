import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] border border-white/20 bg-white/50 p-10 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50/50 dark:bg-zinc-900/50">
        <div className="text-center">
          <h2 className="text-4xl font-light font-serif tracking-tight text-zinc-900 dark:text-white">Bem-vindo de volta</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Entre para salvar seu histórico de gastos
          </p>
        </div>
        
        <div className="space-y-4">
          <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-white/80 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
            <img src="https://www.google.com/favicon.ico" className="h-5 w-5" alt="Google" />
            Entrar com Google
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/20 dark:border-zinc-800/50"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">Ou use seu e-mail</span></div>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
            <button className="flex w-full items-center justify-center gap-2 rounded-xl gold-gradient-bg py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95">
              Entrar
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Não tem uma conta?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
