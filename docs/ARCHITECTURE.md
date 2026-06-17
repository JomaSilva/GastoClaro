# Arquitetura — GastoClaro

## Visão Geral e Propósito

GastoClaro é uma plataforma SaaS de gestão financeira pessoal com foco premium. Ela combina duas funcionalidades principais:

1. **Concierge Financeiro por IA** — o usuário descreve seus gastos em linguagem natural (ou envia imagens de faturas/extratos) e a IA (Claude da Anthropic) extrai, categoriza e gera insights sobre os gastos.
2. **Radar de Investimentos** — cotações em tempo real de ações brasileiras e americanas, índices e criptomoedas, combinadas com notícias de fontes RSS e análise fundamentalista gerada por IA.

O sistema é SaaS com planos pagos (Standard, Pro, Invest), cobrança via Stripe (ou simulador), autenticação local por e-mail/senha mais Google Sign-In, e um painel administrativo oculto para gerenciamento de usuários.

---

## Stack Tecnológico

### Backend
| Tecnologia | Versão | Papel |
|---|---|---|
| Node.js | ≥ 22 (node:sqlite nativo) | Runtime do servidor |
| TypeScript | ~5.8.2 | Tipagem estática |
| Express | ^4.21.2 | Framework HTTP/API |
| tsx | ^4.21.0 | Execução direta de TypeScript (dev + prod) |
| node:sqlite (nativo) | — | Banco de dados embutido (sem ORM) |
| dotenv | ^17.2.3 | Gerenciamento de variáveis de ambiente |
| yahoo-finance2 | ^3.14.0 | Cotações e dados históricos de ativos |
| fast-xml-parser | ^5.5.9 | Parsing de feeds RSS de notícias |

### Frontend
| Tecnologia | Versão | Papel |
|---|---|---|
| React | ^19.0.0 | Biblioteca de UI |
| React DOM | ^19.0.0 | Renderização para o browser |
| React Router DOM | ^7.13.2 | Roteamento SPA |
| Vite | ^6.2.0 | Bundler e servidor de dev |
| Tailwind CSS | ^4.1.14 | Estilização utilitária |
| @tailwindcss/typography | ^0.5.19 | Estilos para conteúdo Markdown |
| @tailwindcss/vite | ^4.1.14 | Integração Tailwind + Vite |
| @vitejs/plugin-react | ^5.0.4 | Suporte a React no Vite |
| lucide-react | ^0.546.0 | Ícones |
| motion | ^12.23.24 | Animações (Framer Motion v12) |
| recharts | ^3.8.0 | Gráficos (pizza e barras) |
| react-markdown | ^10.1.0 | Renderização de Markdown (análise de IA) |
| axios | ^1.14.0 | Cliente HTTP |
| clsx | ^2.1.1 | Composição condicional de classes CSS |
| tailwind-merge | ^3.5.0 | Merge inteligente de classes Tailwind |

### Serviços Externos
| Serviço | Papel |
|---|---|
| Anthropic Claude (`claude-opus-4-8`) | Processamento de gastos, sinais de investimento, análise de ativos |
| Stripe | Checkout, pagamento com cartão e Google Pay, webhooks |
| Google Identity Services | Google Sign-In (OAuth 2.0 via `tokeninfo` endpoint) |
| Yahoo Finance (yahoo-finance2) | Cotações em tempo real, dados históricos (90 dias), busca de notícias |
| Firebase / Firestore | Inicializado no frontend (integração presente, mas SQLite é a fonte de verdade) |
| RSS Feeds | InfoMoney, Money Times, Seu Dinheiro, E-Investidor, Exame Invest, Brazil Journal, Suno Notícias |

---

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                             │
│                                                             │
│  React SPA (Vite)                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ThemeCtx  │ │AuthCtx   │ │React     │ │localStorage  │  │
│  │(dark/    │ │(user,    │ │Router    │ │(token, cache)│  │
│  │ light)   │ │ token,   │ │Dom       │ │              │  │
│  │          │ │ config)  │ │          │ │              │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / fetch / axios
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Express Server (server.ts)                │
│                    Node.js + TypeScript + tsx                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Vite Dev Middleware (dev)  /  dist/ static (prod)   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Rotas API:                                                 │
│  /api/health          /api/auth/*      /api/admin/*         │
│  /api/reports/*       /api/usage       /api/checkout/*      │
│  /api/ai/*            /api/market-data /api/historical/:s   │
│  /api/asset-context/:s                                      │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │server/   │ │server/   │ │server/   │ │server/       │  │
│  │auth.ts   │ │db.ts     │ │anthropic │ │payments.ts   │  │
│  │(routers, │ │(SQLite,  │ │.ts       │ │(Stripe REST) │  │
│  │ middleware│ │ queries) │ │(Claude   │ │              │  │
│  │          │ │          │ │ API)     │ │              │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│                                                             │
│  ┌──────────────────────┐                                   │
│  │server/news.ts        │                                   │
│  │(RSS + Yahoo Finance  │                                   │
│  │ news, cache 5 min)   │                                   │
│  └──────────────────────┘                                   │
└───────────┬───────────┬──────────────┬──────────────────────┘
            │           │              │
     ┌──────▼───┐  ┌────▼──────┐  ┌───▼──────────┐
     │  SQLite  │  │Anthropic  │  │   Stripe     │
     │gastoclaro│  │Claude API │  │ Checkout API │
     │  .db     │  │(REST)     │  │(REST, no SDK)│
     └──────────┘  └───────────┘  └──────────────┘
            │
     ┌──────▼──────────────────────────────────────┐
     │         Yahoo Finance (yahoo-finance2)       │
     │  quote() / chart() / search() / quoteSummary│
     └──────────────────────────────────────────────┘
            │
     ┌──────▼──────────────────────────────────────┐
     │   RSS Feeds (InfoMoney, Suno, Exame, etc.)  │
     │   Cache em memória: TTL 5 minutos           │
     └──────────────────────────────────────────────┘
```

---

## Estrutura de Diretórios

```
/
├── server.ts              # Entry point: Express app, rotas principais, Vite middleware
├── server/
│   ├── auth.ts            # Routers: /api/auth, /api/admin, /api/reports, /api/checkout, /api/usage
│   │                      # Middlewares: requireAuth, requireAdmin, requirePlan
│   │                      # Lógica de quotas, fulfillment Stripe
│   ├── db.ts              # SQLite nativo, schema, migrations, CRUD, hashing de senhas, sessões, seedAdmin
│   ├── anthropic.ts       # Chamadas ao Claude: processExpenses, generateBatchSignals, analyzeAsset
│   ├── payments.ts        # Stripe REST: createCheckoutSession, retrieveCheckoutSession, verifyStripeWebhook
│   └── news.ts            # Busca RSS + Yahoo Finance news, scoring, deduplicação, cache 5 min
│
├── src/
│   ├── main.tsx           # Entrada React, monta <App /> no #root
│   ├── App.tsx            # Providers (ThemeProvider, AuthProvider, Router), rotas, footer
│   ├── types.ts           # Tipos compartilhados: ExpenseItem, ExpenseReport, Category
│   │
│   ├── context/
│   │   └── AuthContext.tsx  # Estado global: user, token, config (googleClientId, stripeEnabled)
│   │                        # Funções: login, loginWithGoogle, register, logout, refreshUser
│   │
│   ├── components/
│   │   ├── Navbar.tsx          # Barra de navegação responsiva (desktop + mobile hamburger)
│   │   ├── MarketTicker.tsx    # Ticker horizontal animado com cotações em tempo real
│   │   ├── ThemeProvider.tsx   # Context de tema dark/light com persistência em localStorage
│   │   ├── ThemeToggle.tsx     # Botão sol/lua para alternar tema
│   │   ├── ProtectedRoute.tsx  # Guard de rota: auth + plano mínimo
│   │   ├── ExpenseCharts.tsx   # Gráficos de pizza e barras horizontais (recharts)
│   │   ├── ExpenseTable.tsx    # Tabela de itens categorizados
│   │   ├── InsightCards.tsx    # Cards de insights e recomendações da IA
│   │   └── GoogleSignInButton.tsx  # Botão Google Sign-In via GIS (Google Identity Services)
│   │
│   ├── pages/
│   │   ├── Home.tsx           # Landing page com features e CTA
│   │   ├── Login.tsx          # Formulário de login (e-mail/senha + Google)
│   │   ├── Register.tsx       # Formulário de cadastro (e-mail/senha + Google)
│   │   ├── Dashboard.tsx      # Análise de gastos: textarea + upload de imagens → relatório IA
│   │   ├── History.tsx        # Histórico de relatórios com busca e modal de detalhes
│   │   ├── Investments.tsx    # Radar de ativos: cotações reais + sinais IA + gráfico histórico
│   │   ├── Plans.tsx          # Página de planos e preços
│   │   ├── Payment.tsx        # Checkout: Stripe ou simulado
│   │   ├── PaymentSuccess.tsx # Confirmação pós-Stripe, chama /api/checkout/confirm
│   │   └── Admin.tsx          # Painel de administração de usuários (acesso restrito)
│   │
│   ├── services/
│   │   └── claude.ts          # Cliente front-end para os endpoints /api/ai/*
│   │
│   ├── lib/
│   │   ├── exportUtils.ts     # Exportação CSV, Excel (.xls), PDF (via window.print), Google Sheets (clipboard)
│   │   └── utils.ts           # cn(), formatCurrency(), fileToBase64()
│   │
│   ├── constants/
│   │   ├── plans.ts           # Definição dos planos (Standard/Pro/Invest), limites, helpers
│   │   └── investments.ts     # Dados estáticos de referência: SIGNALS, MARKET_DATA, SENTIMENT_NEWS
│   │
│   └── firebase.ts            # Inicialização Firebase App, Auth e Firestore (presente mas não usado no fluxo principal)
│
├── data/                  # Banco SQLite em runtime (gastoclaro.db) — criado automaticamente
├── dist/                  # Build de produção gerado pelo Vite
├── docs/                  # Documentação do projeto
├── firestore.rules        # Regras de segurança do Firestore (não aplicadas em produção no momento)
├── firebase-applet-config.json  # Credenciais Firebase (ver SECURITY_REVIEW.md — CRIT-2)
├── .env.example           # Template de variáveis de ambiente
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Fluxos de Dados

### 1. Fluxo de Autenticação

**Registro por e-mail/senha:**
```
Browser → POST /api/auth/register { name, email, password }
  → server/auth.ts: valida campos, checa duplicata
  → server/db.ts: createUser() → scrypt(password, salt) → INSERT users
  → createSession() → INSERT sessions (token 32 bytes hex, expira em 30 dias)
  ← { token, user: { id, name, email, plan, role, ... } }
Browser → localStorage.setItem('gastoclaro_token', token)
```

**Login Google:**
```
Browser → GoogleSignInButton (Google Identity Services SDK)
  → Google OAuth → credential (JWT ID Token)
Browser → POST /api/auth/google { credential }
  → server/auth.ts: verifyGoogleIdToken()
      → GET https://oauth2.googleapis.com/tokeninfo?id_token=...
      → verifica aud === GOOGLE_CLIENT_ID, email_verified
  → se existe por google_id ou email: reutiliza / vincula
  → se novo: createGoogleUser()
  → createSession()
  ← { token, user }
```

**Verificação de sessão:**
```
Browser → GET /api/auth/me (Authorization: Bearer <token>)
  → requireAuth middleware → getUserByToken(token)
      → SELECT sessions WHERE token = ? → verifica expires_at
      → getUserById(user_id)
  ← { user }
```

### 2. Fluxo de Análise de Gastos (Dashboard)

```
Usuário digita gastos ou anexa imagens
  → Browser → fileToBase64(file) para cada imagem
  → POST /api/ai/process-expenses { text, imagesData: [{data, mimeType}] }
      → requirePlan('standard') → requireAuth → verifica plano
      → quotaStatus(user, 'report') → getUsageCount()
      → server/anthropic.ts: processExpenses(text, imagesData)
          → callClaude(messages, { systemPrompt })
              → POST https://api.anthropic.com/v1/messages
              → modelo: claude-opus-4-8, max_tokens: 50000
              → retry exponencial em 429/500/502/503/529 (máx 4 tentativas)
          → extractJson(content)
      → consumeQuota(user, 'report') → incrementUsage()
  ← ExpenseReport { id, categorized_items, category_totals, total_amount, insights, ... }

Browser → localStorage.setItem('last_report', JSON.stringify(result))
Browser → POST /api/reports { report } (fire-and-forget, persiste no histórico)
  → server/auth.ts: createReport(userId, report) → INSERT reports
```

### 3. Fluxo de Análise de Ativo (Investments)

```
Usuário clica em ativo → AssetDetailsModal → aba "IA"
  → Browser → GET /api/asset-context/:symbol
      → yahooFinance.quote(symbol)
      → yahooFinance.quoteSummary(symbol, modules)
      → fetchAssetNews({ symbol, yahooFinance }) → RSS + Yahoo Finance search, dedup, score
      ← { quote, summary, news, newsSummary }
  → Browser → POST /api/ai/analyze-asset { symbol, contextData }
      → requirePlan('standard') → quotaStatus(user, 'ai_analysis')
      → server/anthropic.ts: analyzeAsset(symbol, contextData)
          → callClaude(prompt com ASSET_CONTEXT + FUNDAMENTAL_DATA + NEWS_CONTEXT)
          → resposta em Markdown profissional
      → consumeQuota(user, 'ai_analysis')
  ← { analysis: "..." } → renderizado com ReactMarkdown
```

### 4. Fluxo de Pagamento (Stripe)

```
Usuário seleciona plano → /payment?plan=pro
  → POST /api/checkout/session { plan }
      → requireAuth
      → createCheckoutSession({ user, plan, origin })
          → POST https://api.stripe.com/v1/checkout/sessions
          → success_url: origin/payment/success?session_id={CHECKOUT_SESSION_ID}
          → metadata: { userId, planId }
      ← { enabled: true, url: "https://checkout.stripe.com/..." }
  → Browser redireciona para Stripe Checkout

Stripe → webhook POST /api/checkout/webhook
  → express.raw() (corpo bruto para validação HMAC)
  → verifyStripeWebhook(body, stripe-signature)
      → HMAC-SHA256, janela de ±5 minutos
  → fulfillStripeCheckout(session)
      → createPayment() → INSERT payments
      → updateUserPlan(userId, planId) → UPDATE users SET plan = ?

Browser (retorno) → GET /payment/success?session_id=cs_...
  → POST /api/checkout/confirm { sessionId }
      → retrieveCheckoutSession(sessionId)
      → verifica payment_status === 'paid' e metadata.userId
      → fulfillStripeCheckout(session) (idempotente — UNIQUE index em external_id)
  → refreshUser() → atualiza plano no contexto React
```

---

## Schema do Banco de Dados (SQLite)

```sql
-- Usuários do sistema
CREATE TABLE users (
  id            TEXT PRIMARY KEY,                        -- UUID v4
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',               -- 'salt:hash' (scrypt, 64 bytes)
  plan          TEXT NOT NULL DEFAULT 'free',           -- 'free' | 'standard' | 'pro' | 'invest'
  role          TEXT NOT NULL DEFAULT 'user',           -- 'user' | 'admin' | 'superadmin'
  banned        INTEGER NOT NULL DEFAULT 0,             -- 0 ou 1
  auth_provider TEXT NOT NULL DEFAULT 'local',          -- 'local' | 'google'
  google_id     TEXT,                                   -- Sub do Google Identity
  created_at    TEXT NOT NULL DEFAULT (datetime('now')) -- ISO 8601
);

-- Sessões de autenticação (token Bearer)
CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,                          -- 32 bytes hex aleatórios
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL                              -- agora + 30 dias
);

-- Registro de pagamentos (Stripe e simulados)
CREATE TABLE payments (
  id          TEXT PRIMARY KEY,                         -- UUID v4
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  amount      REAL NOT NULL,                            -- valor em BRL
  card_last4  TEXT,                                     -- 4 últimos dígitos (simulado)
  provider    TEXT NOT NULL DEFAULT 'simulated',        -- 'simulated' | 'stripe'
  external_id TEXT,                                     -- checkout session ID Stripe (UNIQUE parcial)
  status      TEXT NOT NULL DEFAULT 'paid',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Histórico de relatórios de gastos por usuário
CREATE TABLE reports (
  id               TEXT PRIMARY KEY,                    -- UUID v4
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount     REAL NOT NULL DEFAULT 0,
  highest_category TEXT,
  item_count       INTEGER NOT NULL DEFAULT 0,
  month_reference  TEXT,                                -- 'junho 2026'
  payload          TEXT NOT NULL,                       -- JSON completo do ExpenseReport
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contadores de uso mensal por plano
CREATE TABLE usage_counters (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period  TEXT NOT NULL,                                -- 'YYYY-MM'
  kind    TEXT NOT NULL,                                -- 'report' | 'ai_analysis'
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period, kind)
);

-- Índices
CREATE UNIQUE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX idx_payments_external_id ON payments(external_id) WHERE external_id IS NOT NULL;
```

---

## Serviços Externos e seus Papéis

| Serviço | Configuração | Papel detalhado |
|---|---|---|
| **Anthropic Claude** | `ANTHROPIC_API_KEY` | Processa gastos (extrai, categoriza, insights), gera sinais de investimento por ativo, produz análise fundamentalista em Markdown. Modelo: `claude-opus-4-8`. Retry automático em erros 429/5xx. |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout hospedado (cartão + Google Pay), webhook HMAC-SHA256 como fonte de verdade de pagamento, idempotência por `external_id`. |
| **Google OAuth** | `GOOGLE_CLIENT_ID` | Google Sign-In via Google Identity Services no browser; token verificado server-side via `tokeninfo` endpoint. |
| **Yahoo Finance** | — (sem chave) | Cotações em tempo real (`quote`), dados históricos de 90 dias (`chart`), busca de notícias (`search`), dados fundamentalistas (`quoteSummary`). |
| **RSS Feeds** | — | 7 feeds financeiros brasileiros (InfoMoney, Suno, Exame Invest, etc.). Cache em memória de 5 minutos. Usado para enriquecer sinais de IA com notícias recentes. |
| **Firebase / Firestore** | `firebase-applet-config.json` | Inicializado no frontend mas não usado no fluxo principal de produção. A autenticação e persistência real usam SQLite. |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sim | Chave da API Anthropic. Sem ela o processamento de gastos e análises de IA falham com erro 500. |
| `BRAPI_TOKEN` | Não | Token da API BRAPI para cotações alternativas (não implementado no código atual). |
| `STRIPE_SECRET_KEY` | Não | Chave secreta Stripe (`sk_test_...` ou `sk_live_...`). Sem ela, o app usa checkout simulado automaticamente. |
| `STRIPE_WEBHOOK_SECRET` | Não | Segredo do webhook Stripe (`whsec_...`). Necessário para validar eventos de pagamento do lado do servidor. |
| `PUBLIC_BASE_URL` | Não (recomendado em prod) | URL pública base (ex: `https://app.seudominio.com`). Usada nas `success_url`/`cancel_url` do Stripe. Em localhost é inferida do `req.headers.origin`. |
| `GOOGLE_CLIENT_ID` | Não | OAuth Client ID do Google (tipo "Web"). Habilita o botão "Continuar com Google" no login/cadastro. |
| `ADMIN_EMAIL` | Não (padrão: `adm`) | E-mail da conta de administrador criada no boot. **Alterar obrigatoriamente em produção.** |
| `ADMIN_PASSWORD` | Não (padrão: `adm2070`) | Senha da conta de administrador. **Alterar obrigatoriamente em produção** (ver SECURITY_REVIEW CRIT-1). |
| `PORT` | Não (padrão: `3000`) | Porta TCP do servidor Express. |
| `NODE_ENV` | Não | `production` ativa o modo estático do Express (serve `dist/`). Em dev, usa Vite middleware. |
| `DISABLE_HMR` | Não | `true` desabilita Hot Module Replacement do Vite (usado em ambientes de agente como AI Studio). |
