// Integração de pagamento com a Stripe usando a REST API diretamente (sem SDK).
// O Stripe Checkout exibe automaticamente o Google Pay (e Apple Pay) quando o
// dispositivo/navegador suporta, então uma única integração cobre cartão + Google Pay.
//
// Configure STRIPE_SECRET_KEY (sk_test_... ou sk_live_...) no .env.local para ativar.
// Sem a chave, o app continua funcionando no modo de checkout simulado.

import crypto from "node:crypto";
import type { UserRow } from "./db";
import type { PlanDef } from "../src/constants/plans";

const STRIPE_API = "https://api.stripe.com/v1";

export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function isStripeWebhookConfigured(): boolean {
  return !!process.env.STRIPE_WEBHOOK_SECRET;
}

// Verifica a assinatura de um webhook da Stripe sem SDK (HMAC-SHA256 sobre `${t}.${payload}`).
// Retorna o evento (objeto) se válido, ou null caso contrário.
export function verifyStripeWebhook(
  rawBody: Buffer | string,
  signatureHeader: string | undefined
): any | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return null;

  const parts = signatureHeader.split(",").map((p) => p.split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signature = parts.find(([k]) => k === "v1")?.[1];
  if (!timestamp || !signature) return null;

  const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
    return null;
  }

  // Janela de tolerância de 5 minutos contra replay.
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY não configurada.");
  }
  return key;
}

async function stripeRequest(
  pathName: string,
  method: "GET" | "POST",
  form?: URLSearchParams
): Promise<any> {
  const response = await fetch(`${STRIPE_API}${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${getStripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form ? form.toString() : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Erro na API da Stripe (${response.status}).`;
    throw new Error(message);
  }
  return data;
}

interface CreateSessionInput {
  user: UserRow;
  plan: PlanDef;
  origin: string;
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
  payment_status?: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession({
  user,
  plan,
  origin,
}: CreateSessionInput): Promise<StripeCheckoutSession> {
  const form = new URLSearchParams();
  form.set("mode", "payment");
  // A Stripe substitui {CHECKOUT_SESSION_ID} pela id real ao redirecionar.
  form.set("success_url", `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${origin}/payment?plan=${plan.id}&canceled=1`);
  form.set("client_reference_id", user.id);
  form.set("customer_email", user.email);
  form.set("metadata[userId]", user.id);
  form.set("metadata[planId]", plan.id);
  // "card" no Checkout já habilita as carteiras (Google Pay / Apple Pay).
  form.set("payment_method_types[0]", "card");
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "brl");
  form.set("line_items[0][price_data][unit_amount]", String(Math.round(plan.price * 100)));
  form.set("line_items[0][price_data][product_data][name]", `GastoClaro — Plano ${plan.name}`);
  form.set(
    "line_items[0][price_data][product_data][description]",
    plan.tagline || `Assinatura do plano ${plan.name}`
  );

  return stripeRequest("/checkout/sessions", "POST", form) as Promise<StripeCheckoutSession>;
}

export async function retrieveCheckoutSession(id: string): Promise<StripeCheckoutSession> {
  return stripeRequest(
    `/checkout/sessions/${encodeURIComponent(id)}`,
    "GET"
  ) as Promise<StripeCheckoutSession>;
}
