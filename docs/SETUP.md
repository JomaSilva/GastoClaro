# Guia de Configuração — GastoClaro

Passo a passo para configurar o ambiente de desenvolvimento local.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Observação |
|---|---|---|
| **Node.js** | 22.x | Obrigatório — o projeto usa `node:sqlite` nativo, disponível a partir do Node 22 |
| **npm** | 10.x | Instalado junto com o Node 22 |
| **Git** | 2.x | Para clonar o repositório |

Verifique as versões instaladas:

```bash
node -v   # deve ser v22.x.x ou superior
npm -v
```

> O projeto **não funciona** em versões anteriores do Node pois usa a API `DatabaseSync` do módulo `node:sqlite` nativo, introduzida no Node 22.

---

## Clone e Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio> gastoclaro
cd gastoclaro

# 2. Instale as dependências
npm install
```

---

## Variáveis de Ambiente

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env.local
```

Abra `.env.local` em um editor e configure as variáveis conforme a tabela abaixo.

### Tabela de Variáveis

| Variável | Obrigatória | Valor de exemplo | Descrição |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **Sim** | `sk-ant-api03-...` | Chave de API da Anthropic. Sem ela, o processamento de gastos e as análises de IA não funcionam. Obtenha em [console.anthropic.com](https://console.anthropic.com). |
| `ADMIN_EMAIL` | Recomendado | `admin@seudominio.com` | E-mail da conta de administrador criada automaticamente no primeiro boot. **Padrão inseguro: `adm`** — altere antes de subir para produção. |
| `ADMIN_PASSWORD` | Recomendado | `SenhaForte2026!` | Senha da conta de administrador. **Padrão inseguro: `adm2070`** — altere antes de subir para produção. Mínimo recomendado: 12 caracteres. |
| `GOOGLE_CLIENT_ID` | Não | `1234567890-abc.apps.googleusercontent.com` | OAuth Client ID do Google. Habilita o botão "Continuar com Google" no login e cadastro. Sem essa variável, o botão Google fica inativo. |
| `STRIPE_SECRET_KEY` | Não | `sk_test_...` | Chave secreta da Stripe. Sem ela, o checkout usa o modo simulado automaticamente. Use `sk_test_...` em desenvolvimento e `sk_live_...` em produção. |
| `STRIPE_WEBHOOK_SECRET` | Não | `whsec_...` | Segredo do webhook Stripe para validar eventos de pagamento. Necessário apenas quando `STRIPE_SECRET_KEY` está configurada. |
| `PUBLIC_BASE_URL` | Não (prod: Sim) | `https://app.seudominio.com` | URL pública base da aplicação. Usada para montar as URLs de sucesso/cancelamento do Stripe. Em localhost pode ser omitida (será inferida do header `Origin`). Em produção atrás de proxy, deve ser definida. |
| `BRAPI_TOKEN` | Não | `seu_token_brapi` | Token da API BRAPI para cotações alternativas. Não implementado no fluxo atual. |
| `PORT` | Não | `3000` | Porta do servidor Express. Padrão: `3000`. |
| `NODE_ENV` | Não | `production` | Define o modo de operação. Em `production`, o Express serve a pasta `dist/` estática. Em qualquer outro valor (ou omitido), usa o middleware Vite em modo de desenvolvimento. |
| `DISABLE_HMR` | Não | `true` | Desabilita o Hot Module Replacement do Vite. Útil em ambientes de agente (AI Studio) para evitar flickering durante edições automatizadas. |

### Exemplo de `.env.local` mínimo para desenvolvimento

```bash
# Obrigatório para IA funcionar
ANTHROPIC_API_KEY=sk-ant-api03-suachaveaqui

# Recomendado alterar sempre
ADMIN_EMAIL=admin@localhost.dev
ADMIN_PASSWORD=SenhaSegura2026!
```

---

## Configuração do Google Sign-In (opcional)

Para habilitar o botão "Continuar com Google":

1. Acesse [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crie ou selecione um projeto
3. Vá em **Credenciais → Criar credenciais → ID do cliente OAuth**
4. Tipo de aplicativo: **Aplicativo da Web**
5. Em **Origens JavaScript autorizadas**, adicione:
   - `http://localhost:3000` (desenvolvimento)
   - `https://app.seudominio.com` (produção)
6. Copie o **ID do cliente** (formato: `1234567890-abc.apps.googleusercontent.com`)
7. Adicione ao `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```
8. Reinicie o servidor

> Sem essa configuração, o botão Google exibe uma mensagem de fallback orientando a configuração.

---

## Configuração do Stripe (opcional)

Para habilitar pagamentos reais com cartão e Google Pay:

### 1. Obter as chaves

1. Acesse [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copie a **Chave secreta** (`sk_test_...` para testes)
3. Adicione ao `.env.local`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_suachaveaqui
   ```

### 2. Configurar o webhook (necessário para ativação confiável de planos)

O webhook garante que o plano seja ativado mesmo se o usuário fechar o navegador antes de retornar ao site após o pagamento.

**Em desenvolvimento (usando Stripe CLI):**

```bash
# Instale a Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

# Encaminhe eventos para o servidor local
stripe listen --forward-to localhost:3000/api/checkout/webhook
```

A CLI exibe o segredo do webhook (`whsec_...`). Adicione ao `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_seuwebhooksecretaqui
```

**Em produção:**

1. Acesse [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em **Adicionar endpoint**
3. URL: `https://app.seudominio.com/api/checkout/webhook`
4. Eventos: selecione `checkout.session.completed` e `checkout.session.async_payment_succeeded`
5. Copie o **Segredo de assinatura** (`whsec_...`) e adicione ao `.env` de produção

### 3. Testar pagamentos em desenvolvimento

Use os [cartões de teste da Stripe](https://stripe.com/docs/testing):
- Número: `4242 4242 4242 4242`
- Validade: qualquer data futura (ex: `12/30`)
- CVV: qualquer 3 dígitos

> Sem `STRIPE_SECRET_KEY` configurada, o app usa automaticamente o checkout simulado (não processa pagamentos reais).

---

## Executando Localmente

### Modo Desenvolvimento

```bash
npm run dev
```

Isso inicia o servidor Express com TypeScript via `tsx`. O servidor integra o Vite Dev Server com HMR (Hot Module Replacement) para o frontend.

Acesse: [http://localhost:3000](http://localhost:3000)

**O que acontece no boot:**
1. `dotenv` carrega `.env.local` e `.env`
2. Banco de dados SQLite criado/aberto em `./data/gastoclaro.db`
3. Schema criado se não existir (tabelas `users`, `sessions`, `payments`, `reports`, `usage_counters`)
4. Migrações de coluna executadas (`ensureColumn`)
5. `seedAdmin()` cria a conta de administrador (se não existir)
6. Express inicia na porta 3000 com middleware Vite

### Modo Produção

```bash
# 1. Build do frontend
npm run build

# 2. Iniciar servidor de produção
npm start
```

`npm run build` executa `vite build` e gera a pasta `dist/` com o bundle otimizado do React. `npm start` define `NODE_ENV=production` e inicia o Express, que serve `dist/` como estático e faz fallback para `dist/index.html` (SPA routing).

---

## Inicialização do Banco de Dados

O banco de dados SQLite é criado automaticamente no diretório `./data/gastoclaro.db` na primeira execução. Não é necessário nenhum comando adicional.

**Localização:** `./data/gastoclaro.db`

O diretório `./data/` é criado automaticamente por `mkdirSync(DATA_DIR, { recursive: true })` no início do `server/db.ts`.

### Conta administrador inicial

A função `seedAdmin()` em `server/db.ts` cria automaticamente uma conta de administrador no primeiro boot (ou promove uma conta existente para `superadmin`):

- **E-mail:** valor de `ADMIN_EMAIL` (padrão: `adm`)
- **Senha:** valor de `ADMIN_PASSWORD` (padrão: `adm2070`)
- **Plano:** `invest` (acesso completo)
- **Papel:** `superadmin`

> **Importante:** O padrão `adm` / `adm2070` é inseguro e deve ser sobrescrito pelas variáveis de ambiente antes de qualquer exposição à internet. Veja `SECURITY_REVIEW.md` — CRIT-1.

Para acessar o painel admin: faça login com a conta de administrador e acesse `/admin`.

### Reset do banco (desenvolvimento)

Para zerar todos os dados e começar do zero:

```bash
rm ./data/gastoclaro.db
```

O banco será recriado automaticamente no próximo boot.

---

## Scripts Disponíveis

| Script | Comando | Descrição |
|---|---|---|
| Desenvolvimento | `npm run dev` | Inicia Express + Vite Dev Server com HMR |
| Build | `npm run build` | Gera bundle de produção em `dist/` |
| Produção | `npm start` | Serve o build de produção (`NODE_ENV=production`) |
| Preview | `npm run preview` | Preview local do build de produção via Vite |
| Clean | `npm run clean` | Remove a pasta `dist/` |
| Type check | `npm run lint` | Verifica tipos TypeScript sem emitir arquivos (`tsc --noEmit`) |

---

## Solução de Problemas Comuns

### "node:sqlite" não encontrado

```
Error: Cannot find module 'node:sqlite'
```

Certifique-se de usar Node.js 22 ou superior. O módulo `node:sqlite` é nativo e não está disponível em versões anteriores.

### Erro ao processar gastos (500)

Verifique se `ANTHROPIC_API_KEY` está configurada e válida em `.env.local`. Confirme que o arquivo começa com `sk-ant-`.

### Botão Google não aparece / falha silenciosa

Verifique:
1. `GOOGLE_CLIENT_ID` está configurada em `.env.local`
2. `http://localhost:3000` está nas **Origens JavaScript autorizadas** no Google Cloud Console
3. O servidor foi reiniciado após adicionar a variável

### Stripe retorna erro na criação de sessão

- Confirme que `STRIPE_SECRET_KEY` começa com `sk_test_` ou `sk_live_`
- Para URLs de sucesso/cancelamento corretas em produção, defina `PUBLIC_BASE_URL`
- Verifique os logs do servidor para a mensagem de erro da Stripe

### Webhook Stripe não ativa o plano

- Confirme que `STRIPE_WEBHOOK_SECRET` (`whsec_...`) está configurada
- Em desenvolvimento, a Stripe CLI deve estar rodando: `stripe listen --forward-to localhost:3000/api/checkout/webhook`
- Verifique que a URL do webhook aponta para `/api/checkout/webhook` (com `/api/`)

### Porta 3000 já em uso

```bash
# Rode em outra porta
PORT=3001 npm run dev
```

Ou libere a porta atual:
```bash
lsof -i :3000  # encontra o PID
kill -9 <PID>
```
