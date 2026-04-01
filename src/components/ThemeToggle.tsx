import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { motion, AnimatePresence } from 'motion/react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    console.log('ThemeToggle button clicked');
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/50 text-zinc-600 transition-all hover:bg-white active:scale-95 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 shadow-sm backdrop-blur-md"
      aria-label="Alternar tema"
    >
      {theme === 'light' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
    </button>
  );
}
