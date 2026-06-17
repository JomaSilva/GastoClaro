import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { meetsPlan, isAdminRole, type AccountPlan } from '../constants/plans';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Plano mínimo exigido para acessar (admins sempre passam). */
  minPlan?: AccountPlan;
  /** Se true (padrão), exige usuário autenticado. */
  requireAuth?: boolean;
}

// Guarda de rota: bloqueia acesso direto (inclusive digitando a URL) conforme
// autenticação e plano. Admin/super-admin ignoram a exigência de plano.
export function ProtectedRoute({ children, minPlan, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  if (requireAuth && !user) {
    return (
      <Navigate
        to="/login"
        state={{ redirectTo: location.pathname + location.search }}
        replace
      />
    );
  }

  if (minPlan && user && !isAdminRole(user.role) && !meetsPlan(user.plan, minPlan)) {
    // Logado, mas sem plano suficiente → leva para a página de planos.
    return <Navigate to="/plans" replace />;
  }

  return <>{children}</>;
}
