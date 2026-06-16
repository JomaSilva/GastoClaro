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

- **Banco de dados local (SQLite)**: usa o `node:sqlite` nativo do Node 22 — sem dependências externas. O arquivo fica em `data/gastoclaro.db` (criado automaticamente no primeiro `npm run dev`).
- **Login/Cadastro funcionais**: senhas com hash scrypt + salt, sessões por token (30 dias) salvas no banco. Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
- **Tela de vendas** em `/plans` com 3 planos: **Standard (R$60)**, **Pro (R$100)** e **Invest (R$150)** — cada um com mais limites e funcionalidades que o anterior.
- **Fluxo de compra**: ao clicar em um plano, se não estiver logado o usuário vai para `/login` (e volta automaticamente para o pagamento depois). Se já estiver logado, vai direto para `/payment`. O checkout (`POST /api/checkout`) é simulado, registra o pagamento na tabela `payments` e ativa o plano no perfil do usuário.
