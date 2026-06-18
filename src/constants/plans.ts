export type PlanId = "standard" | "pro" | "invest";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: number; // R$ / mês
  tagline: string;
  highlight?: boolean;
  limits: {
    reportsPerMonth: number | "ilimitado";
    aiAnalysesPerMonth: number | "ilimitado";
    historyMonths: number | "ilimitado";
  };
  features: string[];
}

export const PLANS: PlanDef[] = [
  {
    id: "standard",
    name: "Standard",
    price: 60,
    tagline: "O essencial para organizar suas finanças pessoais.",
    limits: {
      reportsPerMonth: 30,
      aiAnalysesPerMonth: 50,
      historyMonths: 3,
    },
    features: [
      "Até 30 relatórios de gastos por mês",
      "50 análises com IA por mês",
      "Dashboard financeiro completo",
      "Categorização automática de gastos",
      "Histórico de 3 meses",
      "Exportação em CSV",
      "Suporte por e-mail",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 100,
    tagline: "Mais limites e ferramentas para quem leva a sério.",
    highlight: true,
    limits: {
      reportsPerMonth: 100,
      aiAnalysesPerMonth: 200,
      historyMonths: 12,
    },
    features: [
      "Tudo do Standard, e mais:",
      "Até 100 relatórios de gastos por mês",
      "200 análises com IA por mês",
      "Histórico de 12 meses",
      "Cotações de mercado em tempo real",
      "Exportação em CSV, PDF e Excel",
      "Insights e recomendações avançadas",
      "Suporte prioritário",
    ],
  },
  {
    id: "invest",
    name: "Invest",
    price: 150,
    tagline: "A experiência completa, sem limites, com foco em investimentos.",
    limits: {
      reportsPerMonth: "ilimitado",
      aiAnalysesPerMonth: "ilimitado",
      historyMonths: "ilimitado",
    },
    features: [
      "Tudo do Pro, e mais:",
      "Relatórios e análises com IA ilimitados",
      "Sinais de investimento gerados por IA",
      "Análise profunda de ativos (ações, FIIs, cripto)",
      "Alertas personalizados de mercado",
      "Histórico ilimitado",
      "Suporte 24/7 dedicado",
    ],
  },
];

export function getPlan(id: string | null | undefined): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}

// Limites do plano gratuito. 'free' não é comprável (não entra em PLANS): é o
// estado padrão da conta e serve para o usuário testar as funcionalidades do app
// com cotas reduzidas antes de assinar.
export const FREE_LIMITS: PlanDef["limits"] = {
  reportsPerMonth: 5,
  aiAnalysesPerMonth: 5,
  historyMonths: 1,
};

// Limites efetivos de qualquer plano de conta, incluindo 'free' (e planos
// desconhecidos, que caem no piso gratuito).
export function limitsForPlan(plan: string | null | undefined): PlanDef["limits"] {
  return getPlan(plan)?.limits ?? FREE_LIMITS;
}

// Hierarquia de acesso por plano. 'free' é o estado padrão (sem assinatura).
export type AccountPlan = "free" | PlanId;

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  standard: 1,
  pro: 2,
  invest: 3,
};

// Retorna true se o plano do usuário atinge (>=) o plano mínimo exigido.
export function meetsPlan(userPlan: string | null | undefined, minPlan: AccountPlan): boolean {
  const have = PLAN_RANK[userPlan ?? "free"] ?? 0;
  const need = PLAN_RANK[minPlan] ?? 0;
  return have >= need;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
