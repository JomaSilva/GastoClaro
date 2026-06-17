// Banco de dados local usando o SQLite nativo do Node.js (node:sqlite).
// O arquivo do banco fica em ./data/gastoclaro.db — nenhum serviço externo é necessário.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.resolve(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "gastoclaro.db"));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    plan          TEXT NOT NULL DEFAULT 'free',
    role          TEXT NOT NULL DEFAULT 'user',
    banned        INTEGER NOT NULL DEFAULT 0,
    auth_provider TEXT NOT NULL DEFAULT 'local',
    google_id     TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan        TEXT NOT NULL,
    amount      REAL NOT NULL,
    card_last4  TEXT,
    provider    TEXT NOT NULL DEFAULT 'simulated',
    external_id TEXT,
    status      TEXT NOT NULL DEFAULT 'paid',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount     REAL NOT NULL DEFAULT 0,
    highest_category TEXT,
    item_count       INTEGER NOT NULL DEFAULT 0,
    month_reference  TEXT,
    payload          TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usage_counters (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period  TEXT NOT NULL,   -- 'YYYY-MM'
    kind    TEXT NOT NULL,   -- 'report' | 'ai_analysis'
    count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, period, kind)
  );
`);

// ---------- Migrações para bancos já existentes ----------
// ALTER TABLE ... ADD COLUMN é idempotente aqui: só roda se a coluna não existir.
function ensureColumn(table: string, column: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

ensureColumn("users", "role", "role TEXT NOT NULL DEFAULT 'user'");
ensureColumn("users", "banned", "banned INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "auth_provider", "auth_provider TEXT NOT NULL DEFAULT 'local'");
ensureColumn("users", "google_id", "google_id TEXT");
ensureColumn("payments", "provider", "provider TEXT NOT NULL DEFAULT 'simulated'");
ensureColumn("payments", "external_id", "external_id TEXT");

// Índices parciais (ignoram NULL): integridade de vínculo Google e idempotência de pagamento.
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id) WHERE external_id IS NOT NULL;
`);

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  plan: string;
  role: string;
  banned: number;
  auth_provider: string;
  google_id: string | null;
  created_at: string;
}

// ---------- Senhas (scrypt + salt aleatório) ----------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

// ---------- Usuários ----------

export function createUser(name: string, email: string, password: string): UserRow {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
  ).run(id, name.trim(), email.trim().toLowerCase(), hashPassword(password));
  return getUserById(id)!;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as unknown as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as UserRow | undefined;
}

export function getUserByGoogleId(googleId: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId) as unknown as UserRow | undefined;
}

export function updateUserPlan(userId: string, plan: string): void {
  db.prepare("UPDATE users SET plan = ? WHERE id = ?").run(plan, userId);
}

// Cria um usuário autenticado via Google (sem senha local).
export function createGoogleUser(name: string, email: string, googleId: string): UserRow {
  const id = crypto.randomUUID();
  const safeName = name.trim() || email.split("@")[0];
  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, auth_provider, google_id) VALUES (?, ?, ?, '', 'google', ?)"
  ).run(id, safeName, email.trim().toLowerCase(), googleId);
  return getUserById(id)!;
}

// Vincula um google_id a uma conta existente (quando o e-mail já estava cadastrado localmente).
export function linkGoogleId(userId: string, googleId: string): void {
  db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(googleId, userId);
}

// ---------- Administração ----------

export function listUsers(): UserRow[] {
  return db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as unknown as UserRow[];
}

export interface UpdatableUserFields {
  name?: string;
  email?: string;
  plan?: string;
  role?: string;
  banned?: boolean;
}

export function updateUserFields(id: string, fields: UpdatableUserFields): UserRow | undefined {
  const sets: string[] = [];
  const values: Array<string | number> = [];
  if (fields.name !== undefined) { sets.push("name = ?"); values.push(fields.name.trim()); }
  if (fields.email !== undefined) { sets.push("email = ?"); values.push(fields.email.trim().toLowerCase()); }
  if (fields.plan !== undefined) { sets.push("plan = ?"); values.push(fields.plan); }
  if (fields.role !== undefined) { sets.push("role = ?"); values.push(fields.role); }
  if (fields.banned !== undefined) { sets.push("banned = ?"); values.push(fields.banned ? 1 : 0); }
  if (sets.length === 0) return getUserById(id);
  values.push(id);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getUserById(id);
}

export function deleteUser(id: string): void {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

// Quantos administradores ativos (não banidos) existem, opcionalmente excluindo um id.
// Considera tanto 'admin' quanto 'superadmin'.
export function countActiveAdmins(excludeId?: string): number {
  const rows = db
    .prepare("SELECT id FROM users WHERE role IN ('admin', 'superadmin') AND banned = 0")
    .all() as Array<{ id: string }>;
  return rows.filter((r) => r.id !== excludeId).length;
}

// ---------- Relatórios de gastos (histórico do Dashboard, por usuário) ----------

export interface ReportRow {
  id: string;
  user_id: string;
  total_amount: number;
  highest_category: string | null;
  item_count: number;
  month_reference: string | null;
  payload: string;
  created_at: string;
}

export function createReport(userId: string, report: any): ReportRow {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO reports (id, user_id, total_amount, highest_category, item_count, month_reference, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    Number(report?.total_amount) || 0,
    typeof report?.highest_category === "string" ? report.highest_category : null,
    Array.isArray(report?.categorized_items) ? report.categorized_items.length : 0,
    typeof report?.monthReference === "string" ? report.monthReference : null,
    JSON.stringify(report ?? {})
  );
  return db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as unknown as ReportRow;
}

export function listReportsByUser(userId: string): ReportRow[] {
  return db
    .prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as unknown as ReportRow[];
}

export function getReportById(id: string, userId: string): ReportRow | undefined {
  return db
    .prepare("SELECT * FROM reports WHERE id = ? AND user_id = ?")
    .get(id, userId) as unknown as ReportRow | undefined;
}

export function deleteReport(id: string, userId: string): void {
  db.prepare("DELETE FROM reports WHERE id = ? AND user_id = ?").run(id, userId);
}

// ---------- Contadores de uso mensal (limites de plano) ----------

export function getUsageCount(userId: string, period: string, kind: string): number {
  const row = db
    .prepare("SELECT count FROM usage_counters WHERE user_id = ? AND period = ? AND kind = ?")
    .get(userId, period, kind) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function incrementUsage(userId: string, period: string, kind: string): void {
  db.prepare(
    `INSERT INTO usage_counters (user_id, period, kind, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(user_id, period, kind) DO UPDATE SET count = count + 1`
  ).run(userId, period, kind);
}

// ---------- Sessões ----------

const SESSION_DAYS = 30;

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expires
  );
  return token;
}

export function getUserByToken(token: string): UserRow | undefined {
  const row = db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?")
    .get(token) as unknown as { user_id: string; expires_at: string } | undefined;
  if (!row) return undefined;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    deleteSession(token);
    return undefined;
  }
  return getUserById(row.user_id);
}

export function deleteSession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// ---------- Pagamentos ----------

export function createPayment(
  userId: string,
  plan: string,
  amount: number,
  cardLast4: string | null,
  provider: string = "simulated",
  externalId: string | null = null
): string {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO payments (id, user_id, plan, amount, card_last4, provider, external_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, userId, plan, amount, cardLast4, provider, externalId);
  return id;
}

// Evita ativar o mesmo pagamento Stripe duas vezes (idempotência no /confirm).
export function getPaymentByExternalId(externalId: string): { id: string } | undefined {
  return db.prepare("SELECT id FROM payments WHERE external_id = ?").get(externalId) as unknown as
    | { id: string }
    | undefined;
}

// ---------- Seed do administrador ----------
// Cria (ou promove) a conta de administrador. Pode ser sobrescrito por ADMIN_EMAIL / ADMIN_PASSWORD.
function seedAdmin(): void {
  const email = (process.env.ADMIN_EMAIL || "adm").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "adm2070";

  const existing = getUserByEmail(email);
  if (existing) {
    // Garante que a conta semeada seja o super-admin (nível máximo), mas respeita um
    // banimento deliberado feito pelo operador (não desbane automaticamente a cada boot).
    if (existing.role !== "superadmin") {
      updateUserFields(existing.id, { role: "superadmin" });
    }
    return;
  }

  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, plan, role) VALUES (?, ?, ?, ?, 'invest', 'superadmin')"
  ).run(id, "Administrador", email, hashPassword(password));
}

seedAdmin();
