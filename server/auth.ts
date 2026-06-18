import type { Request, Response, NextFunction, Router } from "express";
import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByToken,
  getUserByGoogleId,
  createGoogleUser,
  linkGoogleId,
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  deleteSessionsByUser,
  updateUserPlan,
  updateUserFields,
  deleteUser,
  listUsers,
  countActiveAdmins,
  createPayment,
  getPaymentByExternalId,
  createReport,
  listReportsByUser,
  getReportById,
  deleteReport,
  getUsageCount,
  tryReserveUsage,
  refundUsage,
  createVerificationToken,
  getVerificationToken,
  deleteVerificationToken,
  markEmailVerified,
  type UserRow,
} from "./db";
import { sendVerificationEmail } from "./email";
import { PLANS, limitsForPlan, meetsPlan, isAdminRole, type PlanId, type AccountPlan } from "../src/constants/plans";
import { isStripeEnabled, createCheckoutSession, retrieveCheckoutSession } from "./payments";

// Ativa o plano a partir de uma sessão de checkout paga da Stripe (idempotente).
// Usado tanto pelo /confirm (retorno do cliente) quanto pelo webhook (fonte de verdade).
export function fulfillStripeCheckout(session: any): boolean {
  if (session?.payment_status !== "paid") return false;
  const userId = session?.metadata?.userId;
  const planDef = PLANS.find((p) => p.id === session?.metadata?.planId);
  if (!userId || !planDef) return false;

  const sessionId: string | undefined = session?.id;
  if (sessionId && !getPaymentByExternalId(sessionId)) {
    try {
      createPayment(userId, planDef.id, planDef.price, null, "stripe", sessionId);
    } catch {
      // Corrida com o índice UNIQUE → já foi processado por outra requisição.
    }
  }
  updateUserPlan(userId, planDef.id);
  return true;
}

const BANNED_MESSAGE = "Sua conta foi suspensa. Entre em contato com o suporte.";

// Limita tentativas em endpoints sensíveis de auth (anti brute-force / credential stuffing /
// flood de e-mail). Por IP; janela de 15 min.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

// Hash descartável usado para equalizar o tempo do /login quando o e-mail não existe
// (sem isto, pular o scrypt cria um oráculo de tempo que revela contas existentes).
const TIMING_DUMMY_HASH = hashPassword("timing-equalizer-not-a-real-account");

function publicUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    plan: u.plan,
    role: u.role,
    banned: !!u.banned,
    authProvider: u.auth_provider,
    emailVerified: !!u.email_verified,
    createdAt: u.created_at,
  };
}

function getToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export interface AuthedRequest extends Request {
  user?: UserRow;
  token?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = getToken(req);
  const user = token ? getUserByToken(token) : undefined;
  if (!user) {
    res.status(401).json({ error: "Não autenticado. Faça login para continuar." });
    return;
  }
  if (user.banned) {
    res.status(403).json({ error: BANNED_MESSAGE });
    return;
  }
  req.user = user;
  req.token = token!;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin" && req.user?.role !== "superadmin") {
      res.status(403).json({ error: "Acesso restrito a administradores." });
      return;
    }
    next();
  });
}

// Exige autenticação + plano mínimo (admins/super-admin sempre passam).
// Garante no servidor o que a proteção de rota faz no cliente.
export function requirePlan(minPlan: AccountPlan) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      const user = req.user!;
      if (isAdminRole(user.role) || meetsPlan(user.plan, minPlan)) {
        next();
        return;
      }
      res.status(403).json({
        error: "Seu plano atual não dá acesso a este recurso. Faça um upgrade para continuar.",
      });
    });
  };
}

// ---------- Limites de uso por plano (relatórios/mês, análises IA/mês, histórico) ----------

export type QuotaKind = "report" | "ai_analysis";

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

function planLimitFor(plan: string, kind: QuotaKind): number | "ilimitado" {
  const limits = limitsForPlan(plan); // 'free' recebe a cota de testes de FREE_LIMITS
  return kind === "report" ? limits.reportsPerMonth : limits.aiAnalysesPerMonth;
}

function historyMonthsFor(user: UserRow): number | "ilimitado" {
  if (isAdminRole(user.role)) return "ilimitado";
  return limitsForPlan(user.plan).historyMonths;
}

// Reserva atômica de 1 unidade de cota ANTES da chamada de IA. Corrige a corrida TOCTOU
// (checar-depois-consumir deixava requisições concorrentes passarem todas) e impede o
// estouro do limite sob concorrência. Admins e planos ilimitados sempre passam sem consumir.
// Se a ação falhar depois, chame releaseQuota para devolver a unidade.
export function reserveQuota(
  user: UserRow,
  kind: QuotaKind
): { allowed: boolean; limit: number | "ilimitado" } {
  if (isAdminRole(user.role)) return { allowed: true, limit: "ilimitado" };
  const limit = planLimitFor(user.plan, kind);
  if (limit === "ilimitado") return { allowed: true, limit };
  const allowed = tryReserveUsage(user.id, currentPeriod(), kind, limit);
  return { allowed, limit };
}

// Devolve a cota reservada (quando a ação falhou após reserveQuota).
export function releaseQuota(user: UserRow, kind: QuotaKind): void {
  if (isAdminRole(user.role)) return;
  if (planLimitFor(user.plan, kind) === "ilimitado") return;
  refundUsage(user.id, currentPeriod(), kind);
}

function usageSummary(user: UserRow) {
  const period = currentPeriod();
  const admin = isAdminRole(user.role);
  const reportsLimit = admin ? "ilimitado" : planLimitFor(user.plan, "report");
  const aiLimit = admin ? "ilimitado" : planLimitFor(user.plan, "ai_analysis");
  return {
    period,
    plan: user.plan,
    reports: {
      used: reportsLimit === "ilimitado" ? 0 : getUsageCount(user.id, period, "report"),
      limit: reportsLimit,
    },
    aiAnalyses: {
      used: aiLimit === "ilimitado" ? 0 : getUsageCount(user.id, period, "ai_analysis"),
      limit: aiLimit,
    },
    historyMonths: historyMonthsFor(user),
  };
}

export function createUsageRouter(): Router {
  const router = express.Router();
  router.get("/", requireAuth, (req: AuthedRequest, res) => {
    res.json(usageSummary(req.user!));
  });
  return router;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Verificação do token do Google Sign-In ----------
// Usa o endpoint tokeninfo do Google (sem dependências extras). Confere a audiência
// (aud) contra o GOOGLE_CLIENT_ID e exige e-mail verificado.
async function verifyGoogleIdToken(
  credential: string
): Promise<{ sub: string; email: string; name: string; emailVerified: boolean } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );
  if (!response.ok) return null;

  const data = (await response.json()) as Record<string, unknown>;
  // aud pode ser string ou array dependendo do fluxo — confere a pertinência ao nosso client.
  const aud = data.aud;
  const audOk = Array.isArray(aud) ? aud.includes(clientId) : aud === clientId;
  if (!audOk) return null;
  // Emissor deve ser o Google (defesa em profundidade além do tokeninfo).
  const iss = String(data.iss ?? "");
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") return null;
  // Rejeita tokens expirados explicitamente (não confia só no tokeninfo).
  const exp = Number(data.exp);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return null;
  if (!data.sub || !data.email) return null;

  return {
    sub: String(data.sub),
    email: String(data.email),
    name: typeof data.name === "string" && data.name ? data.name : String(data.email).split("@")[0],
    emailVerified: data.email_verified === "true" || data.email_verified === true,
  };
}

export function createAuthRouter(): Router {
  const router = express.Router();

  // GET /api/auth/config — flags públicas para o frontend (chave pública do Google, Stripe on/off)
  router.get("/config", (_req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || null,
      stripeEnabled: isStripeEnabled(),
    });
  });

  // POST /api/auth/register
  router.post("/register", authLimiter, async (req, res) => {
    const { name, email, password } = req.body ?? {};

    if (typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Informe seu nome completo." });
      return;
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: "Informe um e-mail válido." });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }
    if (password.length > 200) {
      res.status(400).json({ error: "A senha é muito longa." });
      return;
    }
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
      res.status(400).json({ error: "Essa senha é muito comum. Escolha uma senha mais forte." });
      return;
    }
    if (getUserByEmail(email)) {
      res.status(409).json({ error: "Já existe uma conta com este e-mail." });
      return;
    }

    const user = createUser(name, email, password);
    const verifyToken = createVerificationToken(user.id);
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      (typeof req.headers.origin === "string" && req.headers.origin) ||
      `${req.protocol}://${req.get("host")}`;
    const verifyLink = `${baseUrl}/verify-email?token=${verifyToken}`;

    const smtpConfigured = !!process.env.SMTP_HOST;
    if (smtpConfigured) {
      try {
        await sendVerificationEmail(user.email, user.name, verifyToken, baseUrl);
      } catch (err) {
        console.error("[email] Falha ao enviar e-mail de verificação:", err);
      }
    }

    res.status(201).json({
      needsVerification: true,
      email: user.email,
      ...(!smtpConfigured && { devLink: verifyLink }),
    });
  });

  // POST /api/auth/login
  router.post("/login", (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "Informe e-mail e senha." });
      return;
    }

    const user = getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: "E-mail ou senha incorretos." });
      return;
    }
    if (user.banned) {
      res.status(403).json({ error: BANNED_MESSAGE });
      return;
    }
    if (!user.email_verified) {
      res.status(403).json({
        error: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
        code: "email_not_verified",
        email: user.email,
      });
      return;
    }

    const token = createSession(user.id);
    res.json({ token, user: publicUser(user) });
  });

  // POST /api/auth/google — login/cadastro via conta Google
  router.post("/google", async (req, res) => {
    const { credential } = req.body ?? {};

    if (typeof credential !== "string" || !credential) {
      res.status(400).json({ error: "Credencial do Google ausente." });
      return;
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      res.status(503).json({ error: "Login com Google não está configurado neste servidor." });
      return;
    }

    let profile: Awaited<ReturnType<typeof verifyGoogleIdToken>> = null;
    try {
      profile = await verifyGoogleIdToken(credential);
    } catch {
      res.status(502).json({ error: "Falha ao validar o login com Google." });
      return;
    }

    if (!profile) {
      res.status(401).json({ error: "Login com Google inválido ou expirado." });
      return;
    }
    if (!profile.emailVerified) {
      res.status(401).json({ error: "Sua conta Google não tem e-mail verificado." });
      return;
    }

    let user = getUserByGoogleId(profile.sub) || getUserByEmail(profile.email);
    if (user) {
      if (user.banned) {
        res.status(403).json({ error: BANNED_MESSAGE });
        return;
      }
      if (!user.google_id) {
        // Hardening: nunca vincular/logar automaticamente uma conta admin via Google.
        // O vínculo de uma conta administrativa deve ser feito estando autenticado.
        if (user.role === "admin") {
          res.status(409).json({
            error: "Esta conta é administrativa. Faça login com e-mail e senha.",
          });
          return;
        }
        linkGoogleId(user.id, profile.sub);
        user = getUserById(user.id)!;
      }
    } else {
      user = createGoogleUser(profile.name, profile.email, profile.sub);
    }

    const token = createSession(user.id);
    res.json({ token, user: publicUser(user) });
  });

  // GET /api/auth/verify-email?token=xxx — confirma o e-mail e retorna sessão
  router.get("/verify-email", (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      res.status(400).json({ error: "Token ausente." });
      return;
    }
    const row = getVerificationToken(token);
    if (!row) {
      // Token de uso único: ausente = nunca existiu OU já foi consumido (e-mail provavelmente
      // já confirmado). O front usa o code para guiar ao login em vez de mostrar erro grave.
      res.status(400).json({ error: "Link inválido ou já utilizado.", code: "invalid_or_used" });
      return;
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      deleteVerificationToken(token);
      res.status(400).json({ error: "Link expirado. Solicite um novo e-mail de verificação.", code: "expired" });
      return;
    }
    markEmailVerified(row.user_id);
    deleteVerificationToken(token);
    const user = getUserById(row.user_id);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }
    const sessionToken = createSession(user.id);
    res.json({ token: sessionToken, user: publicUser(user) });
  });

  // POST /api/auth/resend-verification — reenvia o e-mail de verificação
  router.post("/resend-verification", async (req, res) => {
    const { email } = req.body ?? {};
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: "E-mail inválido." });
      return;
    }
    const user = getUserByEmail(email);
    // Resposta genérica para não revelar existência de contas.
    if (!user || user.email_verified) {
      res.json({ ok: true });
      return;
    }
    const verifyToken = createVerificationToken(user.id);
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      (typeof req.headers.origin === "string" && req.headers.origin) ||
      `${req.protocol}://${req.get("host")}`;
    const verifyLink = `${baseUrl}/verify-email?token=${verifyToken}`;

    const smtpConfigured = !!process.env.SMTP_HOST;
    if (smtpConfigured) {
      try {
        await sendVerificationEmail(user.email, user.name, verifyToken, baseUrl);
      } catch (err) {
        console.error("[email] Falha ao reenviar e-mail:", err);
        res.status(502).json({ error: "Falha ao enviar e-mail. Tente novamente mais tarde." });
        return;
      }
    }

    res.json({ ok: true, ...(!smtpConfigured && { devLink: verifyLink }) });
  });

  // GET /api/auth/me
  router.get("/me", requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: publicUser(req.user!) });
  });

  // POST /api/auth/logout
  router.post("/logout", (req, res) => {
    const token = getToken(req);
    if (token) deleteSession(token);
    res.json({ ok: true });
  });

  return router;
}

// ---------- Painel administrativo (oculto para usuários comuns) ----------
export function createAdminRouter(): Router {
  const router = express.Router();
  router.use(requireAdmin);

  // GET /api/admin/users — lista todos os usuários
  router.get("/users", (_req, res) => {
    res.json({ users: listUsers().map(publicUser) });
  });

  // PATCH /api/admin/users/:id — edita nome, e-mail, plano, papel ou banimento
  router.patch("/users/:id", (req: AuthedRequest, res) => {
    const target = getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const actor = req.user!;
    const actorSuper = actor.role === "superadmin";
    const targetIsAdminish = target.role === "admin" || target.role === "superadmin";

    // Hierarquia: a conta principal (superadmin) só pode ser editada por ela mesma.
    if (target.role === "superadmin" && target.id !== actor.id) {
      res.status(403).json({ error: "A conta principal de administrador é protegida." });
      return;
    }
    // Admins comuns não gerenciam outros administradores — só o super-admin.
    if (!actorSuper && targetIsAdminish && target.id !== actor.id) {
      res.status(403).json({ error: "Apenas o administrador principal pode gerenciar outros administradores." });
      return;
    }

    const { name, email, plan, role, banned } = req.body ?? {};
    const fields: {
      name?: string;
      email?: string;
      plan?: string;
      role?: string;
      banned?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        res.status(400).json({ error: "Nome inválido." });
        return;
      }
      fields.name = name;
    }

    // Só valida/aplica o e-mail quando ele realmente muda — assim a conta admin
    // legada (e-mail "adm") pode ser salva sem precisar virar um e-mail completo.
    if (email !== undefined && typeof email === "string" && email.trim().toLowerCase() !== target.email) {
      if (!EMAIL_RE.test(email.trim())) {
        res.status(400).json({ error: "E-mail inválido." });
        return;
      }
      const other = getUserByEmail(email);
      if (other && other.id !== target.id) {
        res.status(409).json({ error: "Já existe uma conta com este e-mail." });
        return;
      }
      fields.email = email;
    }

    if (plan !== undefined) {
      const allowedPlans = ["free", "standard", "pro", "invest"];
      if (typeof plan !== "string" || !allowedPlans.includes(plan)) {
        res.status(400).json({ error: "Plano inválido." });
        return;
      }
      fields.plan = plan;
    }

    if (role !== undefined && role !== target.role) {
      if (role !== "user" && role !== "admin") {
        res.status(400).json({ error: "Papel inválido." });
        return;
      }
      // Só o super-admin concede/remove o papel de administrador.
      if (!actorSuper) {
        res.status(403).json({ error: "Apenas o administrador principal pode alterar papéis." });
        return;
      }
      if (target.role === "superadmin") {
        res.status(403).json({ error: "Não é possível alterar o papel do administrador principal." });
        return;
      }
      fields.role = role;
    }

    if (banned !== undefined) {
      if (typeof banned !== "boolean") {
        res.status(400).json({ error: "Valor de banimento inválido." });
        return;
      }
      if (target.id === actor.id && banned) {
        res.status(400).json({ error: "Você não pode banir a si mesmo." });
        return;
      }
      if (banned && targetIsAdminish && !actorSuper) {
        res.status(403).json({ error: "Apenas o administrador principal pode banir outro administrador." });
        return;
      }
      fields.banned = banned;
    }

    // Trava de disponibilidade: não deixar o sistema sem nenhum administrador ativo.
    const removingAdminAccess =
      target.role === "admin" &&
      ((fields.role !== undefined && fields.role !== "admin") || fields.banned === true);
    if (removingAdminAccess && countActiveAdmins(target.id) < 1) {
      res.status(400).json({ error: "Deve permanecer ao menos um administrador ativo." });
      return;
    }

    const updated = updateUserFields(target.id, fields);
    res.json({ user: publicUser(updated!) });
  });

  // DELETE /api/admin/users/:id — remove um usuário
  router.delete("/users/:id", (req: AuthedRequest, res) => {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: "Você não pode excluir a si mesmo." });
      return;
    }
    const target = getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }
    const actorSuper = req.user!.role === "superadmin";
    if (target.role === "superadmin") {
      res.status(403).json({ error: "A conta principal de administrador não pode ser excluída." });
      return;
    }
    if (target.role === "admin" && !actorSuper) {
      res.status(403).json({ error: "Apenas o administrador principal pode excluir outro administrador." });
      return;
    }
    if (
      (target.role === "admin" || target.role === "superadmin") &&
      countActiveAdmins(target.id) < 1
    ) {
      res.status(400).json({ error: "Deve permanecer ao menos um administrador ativo." });
      return;
    }
    deleteUser(target.id);
    res.json({ ok: true });
  });

  return router;
}

// ---------- Histórico de relatórios do Dashboard (por usuário) ----------
export function createReportsRouter(): Router {
  const router = express.Router();

  // POST /api/reports — salva um relatório no histórico do usuário autenticado
  router.post("/", requireAuth, (req: AuthedRequest, res) => {
    const report = req.body?.report ?? req.body;
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      res.status(400).json({ error: "Relatório inválido." });
      return;
    }
    const saved = createReport(req.user!.id, report);
    res.status(201).json({ id: saved.id, createdAt: saved.created_at });
  });

  // GET /api/reports — lista o histórico do usuário, respeitando a janela do plano
  router.get("/", requireAuth, (req: AuthedRequest, res) => {
    const months = historyMonthsFor(req.user!);
    let rows = listReportsByUser(req.user!.id);
    if (months !== "ilimitado") {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      rows = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff.getTime());
    }
    const reports = rows.map((r) => ({
      id: r.id,
      totalAmount: r.total_amount,
      highestCategory: r.highest_category,
      itemCount: r.item_count,
      monthReference: r.month_reference,
      createdAt: r.created_at,
    }));
    res.json({ reports, historyMonths: months });
  });

  // GET /api/reports/:id — relatório completo (apenas do próprio usuário)
  router.get("/:id", requireAuth, (req: AuthedRequest, res) => {
    const row = getReportById(req.params.id, req.user!.id);
    if (!row) {
      res.status(404).json({ error: "Relatório não encontrado." });
      return;
    }
    let report: any = {};
    try {
      report = JSON.parse(row.payload);
    } catch {
      report = {};
    }
    res.json({ id: row.id, createdAt: row.created_at, report });
  });

  // DELETE /api/reports/:id — remove um relatório do histórico
  router.delete("/:id", requireAuth, (req: AuthedRequest, res) => {
    deleteReport(req.params.id, req.user!.id);
    res.json({ ok: true });
  });

  return router;
}

export function createCheckoutRouter(): Router {
  const router = express.Router();

  // POST /api/checkout/session — cria uma sessão de pagamento na Stripe (cartão + Google Pay).
  // Se a Stripe não estiver configurada, devolve { enabled: false } para o front cair no simulado.
  router.post("/session", requireAuth, async (req: AuthedRequest, res) => {
    if (!isStripeEnabled()) {
      res.json({ enabled: false });
      return;
    }

    const planDef = PLANS.find((p) => p.id === req.body?.plan);
    if (!planDef) {
      res.status(400).json({ error: "Plano inválido." });
      return;
    }

    try {
      const origin =
        process.env.PUBLIC_BASE_URL ||
        (typeof req.headers.origin === "string" && req.headers.origin) ||
        `${req.protocol}://${req.get("host")}`;
      const session = await createCheckoutSession({ user: req.user!, plan: planDef, origin });
      res.json({ enabled: true, url: session.url, id: session.id });
    } catch (error) {
      console.error("Error creating Stripe session:", error);
      res.status(502).json({
        error: error instanceof Error ? error.message : "Falha ao iniciar o checkout.",
      });
    }
  });

  // POST /api/checkout/confirm — confirma a sessão da Stripe e ativa o plano (idempotente).
  router.post("/confirm", requireAuth, async (req: AuthedRequest, res) => {
    const sessionId = req.body?.sessionId;
    if (typeof sessionId !== "string" || !sessionId) {
      res.status(400).json({ error: "Sessão inválida." });
      return;
    }

    try {
      const session = await retrieveCheckoutSession(sessionId);
      if (session.payment_status !== "paid") {
        res.status(402).json({ error: "Pagamento ainda não confirmado." });
        return;
      }
      if (session.metadata?.userId !== req.user!.id) {
        res.status(403).json({ error: "Esta sessão de pagamento não pertence à sua conta." });
        return;
      }

      const planDef = PLANS.find((p) => p.id === session.metadata?.planId);
      if (!planDef) {
        res.status(400).json({ error: "Plano não encontrado na sessão." });
        return;
      }

      // Ativação idempotente (mesma lógica usada pelo webhook).
      fulfillStripeCheckout(session);

      res.json({
        ok: true,
        plan: planDef.id,
        amount: planDef.price,
        message: `Pagamento aprovado! Plano ${planDef.name} ativado.`,
      });
    } catch (error) {
      console.error("Error confirming Stripe session:", error);
      res.status(502).json({
        error: error instanceof Error ? error.message : "Falha ao confirmar o pagamento.",
      });
    }
  });

  // POST /api/checkout — pagamento simulado que ativa o plano escolhido (fallback / demonstração)
  router.post("/", requireAuth, (req: AuthedRequest, res) => {
    const { plan, cardNumber, cardName, expiry, cvv } = req.body ?? {};

    const planDef = PLANS.find((p) => p.id === plan);
    if (!planDef) {
      res.status(400).json({ error: "Plano inválido." });
      return;
    }

    const digits = typeof cardNumber === "string" ? cardNumber.replace(/\D/g, "") : "";
    if (digits.length < 13 || digits.length > 19) {
      res.status(400).json({ error: "Número de cartão inválido." });
      return;
    }
    if (typeof cardName !== "string" || cardName.trim().length < 2) {
      res.status(400).json({ error: "Informe o nome impresso no cartão." });
      return;
    }
    if (typeof expiry !== "string" || !/^\d{2}\/\d{2}$/.test(expiry.trim())) {
      res.status(400).json({ error: "Validade inválida (use MM/AA)." });
      return;
    }
    if (typeof cvv !== "string" || !/^\d{3,4}$/.test(cvv.trim())) {
      res.status(400).json({ error: "CVV inválido." });
      return;
    }

    const paymentId = createPayment(
      req.user!.id,
      planDef.id as PlanId,
      planDef.price,
      digits.slice(-4),
      "simulated"
    );
    updateUserPlan(req.user!.id, planDef.id);

    res.json({
      ok: true,
      paymentId,
      plan: planDef.id,
      amount: planDef.price,
      message: `Pagamento aprovado! Plano ${planDef.name} ativado.`,
    });
  });

  return router;
}
