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

## Painel administrativo (oculto)

- Uma conta de administrador é criada automaticamente: **e-mail `adm` / senha `adm2070`** (sobrescreva com `ADMIN_EMAIL` / `ADMIN_PASSWORD`). ⚠️ **Em produção, troque essas credenciais** — são públicas e fáceis de adivinhar. O seed garante o papel `admin`, mas respeita um banimento manual feito pelo operador.
- O link **Admin** aparece na navbar apenas para contas com papel `admin` — usuários comuns nem o veem, e a rota `/admin` é protegida no front e no back (`requireAdmin`).
- Em `/admin` o administrador lista todos os usuários e edita **nome, e-mail, plano, papel (user/admin)**, além de **banir/desbanir** e **excluir** contas (inclusive a própria, com travas de segurança contra autolockout). Endpoints: `GET/PATCH/DELETE /api/admin/users`.

## Mercado BR + EUA

- O endpoint `/api/market-data` agora traz o mercado **brasileiro** e o **americano** (S&P 500, Nasdaq, Dow e ações como AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META), com a moeda correta e a `region` (BR/US).
- A tela de Investimentos tem um seletor **🇧🇷 Brasil / 🇺🇸 EUA / 🌎 Todos** e formata os preços conforme a moeda do ativo.
