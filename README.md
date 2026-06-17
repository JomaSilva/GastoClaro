<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0193e74b-e71b-48ff-ae40-fb86d125eb79

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and set `ANTHROPIC_API_KEY`
3. Run the app:
   `npm run dev`

## Production Deploy

This app is not frontend-only. The React app depends on the Node/Express server in [server.ts](server.ts) for all `/api/*` routes, including market data and AI analysis.

To deploy it correctly on a host:

1. Install dependencies:
   `npm install`
2. Set server environment variables on the host:
   `ANTHROPIC_API_KEY` and `BRAPI_TOKEN`
3. Build the frontend bundle:
   `npm run build`
4. Start the Node server:
   `npm start`

Notes:
- The host must support a persistent Node.js process. Static hosting by itself is not enough.
- In production the server reads `process.env.PORT`, so your host can assign the listening port automatically.

## Autenticação local + Planos

- **Banco de dados local (SQLite)**: usa o `node:sqlite` nativo do Node 22+ — sem dependências externas. O arquivo fica em `data/gastoclaro.db` (criado automaticamente no primeiro `npm run dev`). As migrações de colunas novas rodam sozinhas na inicialização.
- **Login/Cadastro funcionais**: senhas com hash scrypt + salt, sessões por token (30 dias) salvas no banco. Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
- **Login com Google (opcional)**: defina `GOOGLE_CLIENT_ID` para habilitar o botão "Entrar com Google" no login e no cadastro. O servidor valida o ID token do Google (`POST /api/auth/google`) e cria/vincula a conta.
- **Tela de vendas** em `/plans` com 3 planos: **Standard (R$60)**, **Pro (R$100)** e **Invest (R$150)** — cada um com mais limites e funcionalidades que o anterior.

## Pagamento (Stripe + Google Pay)

- Com `STRIPE_SECRET_KEY` configurado, o checkout usa o **Stripe Checkout** real (`POST /api/checkout/session`), que aceita **cartão** e exibe o **Google Pay** automaticamente quando disponível. Após o pagamento o usuário volta para `/payment/success`, que confirma a sessão (`POST /api/checkout/confirm`, idempotente) e ativa o plano.
- **Webhook (fonte de verdade)**: configure `STRIPE_WEBHOOK_SECRET` e aponte um webhook para `POST /api/checkout/webhook` (evento `checkout.session.completed`). Assim o plano é ativado mesmo que o cliente pague e não retorne ao site. A assinatura é validada com HMAC-SHA256 (sem SDK) e a ativação é idempotente.
- **Sem a chave**, o app cai automaticamente no **checkout simulado** (`POST /api/checkout`) — útil para demonstração. Nenhum valor real é cobrado, e um aviso de "modo simulado" aparece na tela de pagamento.
- O checkout usa cobrança única (`mode: payment`) que ativa o plano. Para assinatura recorrente de verdade, troque para `mode: subscription` em `server/payments.ts` e dirija renovações pelo webhook.

## Painel administrativo (oculto) + hierarquia

- A conta semeada **`adm` / `adm2070`** é o **super-admin** (nível máximo). Sobrescreva com `ADMIN_EMAIL` / `ADMIN_PASSWORD`. ⚠️ **Em produção, troque essas credenciais.** O seed garante o papel `superadmin`, mas respeita um banimento manual feito pelo operador.
- **Hierarquia**: só o super-admin concede/remove o papel `admin` de outras contas e gerencia (banir/excluir) outros admins. A conta principal é **protegida** — admins comuns não conseguem editá-la, bani-la ou excluí-la. Admins comuns gerenciam apenas usuários comuns.
- O link **Admin** aparece na navbar apenas para `admin`/`superadmin` — usuários comuns nem o veem, e a rota `/admin` é protegida no front e no back (`requireAdmin`).
- Em `/admin`: lista todos os usuários e edita **nome, e-mail, plano, papel**, **banir/desbanir** e **excluir**, com travas anti-lockout e a UI desabilitando o que cada admin não pode fazer. Endpoints: `GET/PATCH/DELETE /api/admin/users`.

## Controle de acesso por plano + Histórico

- **Dashboard** e **Investimentos** exigem login **+ plano ≥ Standard** (admins sempre passam). A navbar esconde esses links de quem não tem acesso, e a rota é barrada no cliente (inclusive digitando `/dashboard` manualmente) via `ProtectedRoute`, **e** no servidor: os endpoints de IA (`/api/ai/*`) usam `requirePlan("standard")`. `/api/market-data` segue público (ticker da home).
- **Histórico** (`/history`) exige login (qualquer plano) e mostra os relatórios **reais** do usuário. Cada análise do Dashboard é persistida na tabela `reports` (por usuário) e listada no histórico, com detalhe e exclusão. Endpoints: `GET/POST/DELETE /api/reports`.
- **Login com Google** aparece sempre no login/cadastro; sem `GOOGLE_CLIENT_ID` o botão explica como ativar em vez de sumir.

## Mercado BR + EUA

- O endpoint `/api/market-data` agora traz o mercado **brasileiro** e o **americano** (S&P 500, Nasdaq, Dow e ações como AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META), com a moeda correta e a `region` (BR/US).
- A tela de Investimentos tem um seletor **🇧🇷 Brasil / 🇺🇸 EUA / 🌎 Todos** e formata os preços conforme a moeda do ativo.
