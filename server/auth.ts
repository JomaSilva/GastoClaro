import type { Request, Response, NextFunction, Router } from "express";
import express from "express";
import {
  createUser,
  getUserByEmail,
  getUserByToken,
  verifyPassword,
  createSession,
  deleteSession,
  updateUserPlan,
  createPayment,
  type UserRow,
} from "./db";
import { PLANS, type PlanId } from "../src/constants/plans";

function publicUser(u: UserRow) {
  return { id: u.id, name: u.name, email: u.email, plan: u.plan, createdAt: u.created_at };
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
  req.user = user;
  req.token = token!;
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createAuthRouter(): Router {
  const router = express.Router();

  // POST /api/auth/register
  router.post("/register", (req, res) => {
    const { name, email, password } = req.body ?? {};

    if (typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Informe seu nome completo." });
      return;
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: "Informe um e-mail válido." });
      return;
    }
    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (getUserByEmail(email)) {
      res.status(409).json({ error: "Já existe uma conta com este e-mail." });
      return;
    }

    const user = createUser(name, email, password);
    const token = createSession(user.id);
    res.status(201).json({ token, user: publicUser(user) });
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

    const token = createSession(user.id);
    res.json({ token, user: publicUser(user) });
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

export function createCheckoutRouter(): Router {
  const router = express.Router();

  // POST /api/checkout — pagamento simulado que ativa o plano escolhido
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
      digits.slice(-4)
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
