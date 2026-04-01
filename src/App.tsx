import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { MarketTicker } from './components/MarketTicker';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { cn } from './lib/utils';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import History from './pages/History';
import Investments from './pages/Investments';

function AppContent() {
  const { theme } = useTheme();
  
  return (
    <div className={cn(
      "min-h-screen bg-zinc-50 transition-colors duration-300 dark:bg-[#09090b]",
      theme === 'dark' && 'dark'
    )}>
      <Navbar />
      <MarketTicker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      
      <footer className="border-t border-zinc-200/50 bg-white/50 py-16 transition-colors duration-300 dark:border-zinc-800/50 dark:bg-[#09090b]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20">
              <Wallet size={24} />
            </div>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 font-medium">
            © {new Date().getFullYear()} GastoClaro. Gestão Financeira Premium.
          </p>
          <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest max-w-2xl mx-auto">
            Aviso Legal: As informações e sinais apresentados neste site são gerados por inteligência artificial e NÃO constituem recomendação de investimento.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}
