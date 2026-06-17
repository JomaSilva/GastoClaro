# Documentação do Frontend — GastoClaro

O frontend é uma SPA (Single Page Application) em React 19 + TypeScript, construída com Vite e estilizada com Tailwind CSS v4.

---

## Páginas

### `/` — Home (`src/pages/Home.tsx`)

Landing page pública com proposta de valor e CTA. Exibe uma prévia animada do produto (bloco de gestão de gastos e sinais de investimento), grid de funcionalidades (6 cards) e seção de conversão. Não exige autenticação.

---

### `/login` — Login (`src/pages/Login.tsx`)

Formulário de acesso com:
- Campo e-mail + senha (submit via `useAuth().login`)
- Botão "Continuar com Google" (`GoogleSignInButton`)
- Redirecionamento para `redirectTo` (passado via `location.state`) após sucesso; padrão `/dashboard`

Quando o usuário vem da página de planos, o subtítulo muda para "Entre para concluir a assinatura".

---

### `/register` — Cadastro (`src/pages/Register.tsx`)

Formulário de criação de conta com:
- Campos: nome completo, e-mail, senha (mínimo 6 caracteres)
- Botão "Continuar com Google"
- Link para `/login` preservando `redirectTo`

---

### `/dashboard` — Dashboard (`src/pages/Dashboard.tsx`)

**Rota protegida:** requer autenticação + plano `standard` (ou admin).

Duas telas em modo `AnimatePresence`:

**Tela de entrada (sem relatório):**
- Textarea para digitar gastos em linguagem natural
- Upload de múltiplas imagens (faturas, extratos) — limite de 4 MB por arquivo
- Badges de uso mensal (relatórios/mês, análises IA/mês) com link de upgrade quando esgotados
- Preview em miniatura das imagens selecionadas com botão de remoção individual
- Botão "Analisar Gastos" → chama `processExpenses()` → `POST /api/ai/process-expenses`
- Resumo do Radar de Investimentos (3 ativos com sinal COMPRA em destaque)
- Cache do último relatório em `localStorage` (chave `last_report`)

**Tela de resultados (com relatório):**
- KPIs: Total Geral, Maior Categoria, Itens Processados, Status "Analisado"
- `ExpenseCharts` — gráficos de pizza e barras
- `ExpenseTable` — tabela detalhada de itens
- `InsightCards` — insights e recomendações da IA
- Barra de exportação: CSV (sempre), Excel + PDF (planos Pro/Invest/admin), Copiar para Google Sheets
- Botões "Editar" (volta para a textarea) e "Novo Relatório" (limpa tudo + cache)

---

### `/history` — Histórico (`src/pages/History.tsx`)

**Rota protegida:** requer autenticação (qualquer plano).

Lista os relatórios salvos do usuário, exibindo:
- Data, quantidade de itens, maior categoria, valor total
- Busca em tempo real por mês ou categoria
- Aviso sobre janela de histórico do plano (link para `/plans`)
- Click em um item abre `ReportDetailModal` (modal com gráficos + tabela + insights)
- Botão de exclusão individual com confirmação (`window.confirm`)

---

### `/investments` — Investimentos (`src/pages/Investments.tsx`)

**Rota protegida:** requer autenticação + plano `standard` (ou admin).

Tela principal do Radar de Investimentos. Funcionalidades:
- Ticker ao vivo carregado de `/api/market-data` (atualização a cada 60s)
- Tabela de ativos com sinal IA (COMPRA/VENDA/NEUTRO), força (barra de porcentagem), preço, variação, sparkline animada
- Filtros: por sinal (Todos/COMPRA/VENDA/NEUTRO), por região (Todos/BR/US), busca por nome/ticker
- Favoritos (estado local, ícone estrela)
- Botão de notificação por ativo (estado local)
- Click em ativo abre `AssetDetailsModal`:
  - Aba "Gráfico": histórico de 90 dias (Recharts LineChart) carregado de `/api/historical/:symbol`
  - Aba "IA": análise fundamentalista gerada por Claude via `/api/ai/analyze-asset` (renderizada com ReactMarkdown)
  - Dados de notícias recentes integrados no contexto enviado à IA
- Geração de sinais em lote via `generateBatchSignals()` ao carregar dados reais

---

### `/plans` — Planos (`src/pages/Plans.tsx`)

Página pública com os 3 planos disponíveis em cards animados. O plano Pro tem destaque visual ("Mais popular", badge dourado, elevação). Ao clicar em "Assinar agora":
- Se não logado: redireciona para `/login` com `redirectTo: /payment?plan=<id>`
- Se logado: vai para `/payment?plan=<id>`

O plano atual do usuário mostra "Plano atual" (botão desabilitado).

---

### `/payment` — Checkout (`src/pages/Payment.tsx`)

Exige autenticação (redireciona para `/login` se não logado).

**Modo Stripe (quando `config.stripeEnabled === true`):**
- Exibe resumo do pedido
- Botão "Pagar R$X" → `POST /api/checkout/session` → redireciona para Stripe Checkout
- Opção de fallback manual para modo simulado

**Modo simulado (quando Stripe não configurado ou usuário escolhe):**
- Formulário de cartão de crédito (número, nome, validade MM/AA, CVV) com máscaras de input
- Validação client + server
- Submete para `POST /api/checkout` → ativa plano imediatamente

Exibe banner informativo quando `?canceled=1` (cancelou no Stripe) ou quando Stripe não está configurado.

---

### `/payment/success` — Confirmação de Pagamento (`src/pages/PaymentSuccess.tsx`)

Recebe `?session_id=cs_...` da URL de retorno do Stripe. Chama automaticamente `POST /api/checkout/confirm` para validar e ativar o plano. Exibe:
- Estado de carregamento (spinner)
- Estado de sucesso (ícone verde + mensagem + botão Dashboard)
- Estado de erro (ícone vermelho + mensagem de erro + botão Voltar para Planos)

---

### `/admin` — Admin (`src/pages/Admin.tsx`)

Acesso restrito a usuários com `role === 'admin'` ou `role === 'superadmin'`. Usuários comuns são redirecionados para `/`.

Funcionalidades:
- Lista todos os usuários do sistema (carregado de `GET /api/admin/users`)
- Busca em tempo real por nome, e-mail ou plano
- Edição inline por linha: nome, e-mail, plano, papel, status de banimento
- Botão "Salvar" por linha chama `PATCH /api/admin/users/:id`
- Botão "Excluir" por linha chama `DELETE /api/admin/users/:id` com confirmação
- Ícones visuais: coroa (superadmin), escudo (admin), usuário (user), ícone de banimento
- Feedback inline de sucesso/erro por operação

---

## Catálogo de Componentes

### `Navbar` (`src/components/Navbar.tsx`)

**Props:** nenhuma (usa `useAuth()` e `useLocation()` internamente)

Barra de navegação sticky (top-0, z-50) com:
- Logo GastoClaro com link para `/`
- Links de navegação condicionais conforme autenticação e plano:
  - Dashboard e Investimentos: exigem `meetsPlan(user.plan, 'standard')` ou admin
  - Histórico: qualquer usuário logado
  - Planos: sempre visível
  - Admin: apenas admins
- Exibe nome e plano do usuário logado (com gradiente dourado)
- Botão de logout
- `ThemeToggle`
- Menu hamburger para mobile (estado `mobileOpen`)

---

### `MarketTicker` (`src/components/MarketTicker.tsx`)

**Props:** nenhuma

Faixa horizontal animada que rola continuamente com cotações de mercado. Atualiza dados de `/api/market-data` a cada 60 segundos. Usa dados estáticos de `FALLBACK_DATA` (de `src/constants/investments.ts`) enquanto aguarda a resposta da API. Exibe: nome do ativo, preço formatado, variação percentual com ícone de tendência (verde/vermelho).

---

### `ThemeProvider` (`src/components/ThemeProvider.tsx`)

**Props:** `children: React.ReactNode`

Provider de contexto de tema. Persiste a preferência em `localStorage` (chave `theme`). Respeita `prefers-color-scheme` do sistema como padrão. Aplica/remove a classe `dark` no `<html>`. Exporta `useTheme()` hook com `{ theme, toggleTheme }`.

---

### `ThemeToggle` (`src/components/ThemeToggle.tsx`)

**Props:** nenhuma

Botão circular com ícone Sol (claro) ou Lua (escuro). Chama `toggleTheme()` do `ThemeProvider`.

---

### `ProtectedRoute` (`src/components/ProtectedRoute.tsx`)

**Props:**
```typescript
{
  children: React.ReactNode
  minPlan?: AccountPlan        // 'free' | 'standard' | 'pro' | 'invest'
  requireAuth?: boolean        // padrão: true
}
```

Guard de rota. Comportamento:
- Enquanto carrega: exibe spinner centralizado
- Não autenticado + `requireAuth`: redireciona para `/login` com `state.redirectTo`
- Autenticado mas sem plano suficiente: redireciona para `/plans`
- Admins sempre passam (ignoram verificação de plano)

---

### `ExpenseCharts` (`src/components/ExpenseCharts.tsx`)

**Props:**
```typescript
{ data: CategoryTotal[] }
// CategoryTotal: { category: string; amount: number }
```

Dois gráficos lado a lado (layout `lg:grid-cols-2`):
- Gráfico de pizza (Recharts `PieChart` com `innerRadius`, donut style) — Distribuição por Categoria
- Gráfico de barras horizontais (Recharts `BarChart` com `layout="vertical"`) — Comparativo de Valores

Adapta cores de tooltip e eixos ao tema (dark/light) via `useTheme()`.

---

### `ExpenseTable` (`src/components/ExpenseTable.tsx`)

**Props:**
```typescript
{ items: ExpenseItem[] }
// ExpenseItem: { id: string; description: string; amount: number; category: string }
```

Tabela responsiva com cabeçalho fixo (Descrição, Categoria, Valor). Cada categoria é exibida como badge arredondado com cor da marca. Valores formatados em R$ brasileiro (`formatCurrency`).

---

### `InsightCards` (`src/components/InsightCards.tsx`)

**Props:**
```typescript
{
  insights: string[]
  recommendations: string[]
}
```

Dois cards em coluna:
- **Insights da IA** (ícone lâmpada dourado): lista com ícone `TrendingDown`
- **Recomendações** (ícone check verde): lista com bullet verde brilhante

---

### `GoogleSignInButton` (`src/components/GoogleSignInButton.tsx`)

**Props:**
```typescript
{
  onSuccess: () => void
  onError?: (message: string) => void
}
```

Carrega o script Google Identity Services (`https://accounts.google.com/gsi/client`) de forma assíncrona (singleton com `gsiPromise`). Renderiza o botão Google oficial via `window.google.accounts.id.renderButton()` em formato pill. Quando o `GOOGLE_CLIENT_ID` não está configurado, exibe um botão de fallback que ao ser clicado chama `onError` com instrução de configuração.

---

## Gerenciamento de Estado

### `ThemeContext` (`src/components/ThemeProvider.tsx`)

**Estado:** `theme: 'light' | 'dark'`

**Funções:** `toggleTheme()`

**Persistência:** `localStorage` (chave `theme`)

**Inicialização:** preferência salva → `prefers-color-scheme` → `'light'`

---

### `AuthContext` (`src/context/AuthContext.tsx`)

**Estado:**
```typescript
{
  user: AuthUser | null,      // dados do usuário logado
  token: string | null,       // Bearer token da sessão
  loading: boolean,           // true enquanto verifica /api/auth/me no boot
  config: AppConfig           // { googleClientId, stripeEnabled }
}
```

**Funções:**
- `login(email, password)` → `POST /api/auth/login`
- `loginWithGoogle(credential)` → `POST /api/auth/google`
- `register(name, email, password)` → `POST /api/auth/register`
- `logout()` → `POST /api/auth/logout` + limpa localStorage
- `refreshUser()` → `GET /api/auth/me` (recarrega dados do usuário)

**Persistência:** token em `localStorage` (chave `gastoclaro_token`)

**Cache do Dashboard:** `localStorage` (chave `last_report`) — limpo no login/logout para isolar sessões entre contas.

---

## Fluxo de Autenticação (perspectiva do UI)

1. **Boot:** `AuthProvider` lê `gastoclaro_token` do `localStorage` e chama `GET /api/auth/me`. Se o token for válido: preenche `user` e `token`. Se inválido: limpa o `localStorage` e define `user = null`.

2. **Config:** simultaneamente busca `GET /api/auth/config` para obter `googleClientId` e `stripeEnabled`.

3. **Login:** usuário preenche formulário → `login()` → sucesso → `localStorage.setItem(TOKEN_KEY)` → `setUser(data.user)` → `navigate(redirectTo)`.

4. **Google Sign-In:** `GoogleSignInButton` inicializa o GIS com `client_id`. Ao clicar: Google redireciona com credential → `loginWithGoogle(credential)` → mesmo fluxo do login local.

5. **Proteção de rotas:** `ProtectedRoute` verifica `loading`, `user` e `meetsPlan()` antes de renderizar o filho. Redireciona conforme necessário.

6. **Logout:** `logout()` → `DELETE SESSION` no servidor → remove token e cache do `localStorage` → `setUser(null)` → o `Navbar` re-renderiza sem os links protegidos.

7. **Expiração:** sessões duram 30 dias. No boot ou qualquer chamada com token expirado, o `requireAuth` retorna 401 e o frontend remove o token e define `user = null`.

---

## Sistema de Temas (Dark/Light)

O sistema de temas usa a estratégia de classe CSS `dark` no elemento `<html>` (Tailwind v4 com modo `dark`).

**Fluxo de aplicação:**
- `ThemeProvider` aplica/remove `classList.toggle('dark', theme === 'dark')` no `document.documentElement`
- Todos os componentes usam classes `dark:` do Tailwind para estilos alternativos
- `App.tsx` adiciona `dark` ao container raiz quando `theme === 'dark'` (redundância intencional)
- Cores da aplicação: zinc (neutros), brand (âmbar/dourado para elementos premium)

**Gradiente dourado:** classes customizadas `gold-gradient` (texto) e `gold-gradient-bg` (background) usadas em elementos premium (logo, badges de plano, botões CTA, análise de ativos).

---

## Utilitários de Exportação (`src/lib/exportUtils.ts`)

Todas as funções recebem um objeto `ExpenseReport` completo.

### `downloadCSV(report)`
Gera CSV com colunas: Data, Descrição, Categoria, Valor (R$). Inclui BOM UTF-8 para compatibilidade com Excel e Google Sheets. Nomes de arquivo: `gastoclaro-<monthReference>.csv`.

### `downloadExcel(report)`
Gera arquivo `.xls` usando tabela HTML com namespace Microsoft Office (abre nativamente no Excel sem dependências externas). Inclui linha de total. Todos os valores passam por `escapeHtml()` para segurança.

### `exportPDF(report)`
Abre `window.open('', '_blank')` com HTML completo estilizado e chama `window.print()` automaticamente. O usuário escolhe "Salvar como PDF" no diálogo de impressão do navegador. Inclui KPIs, tabela de itens, insights e recomendações. Todos os valores passam por `escapeHtml()`.

### `copyToGoogleSheets(report)`
Copia os dados no formato TSV (Tab-Separated Values) para o clipboard via `navigator.clipboard.writeText()`. O conteúdo pode ser colado diretamente no Google Sheets. Retorna `boolean` (sucesso/falha).

**Obs.:** `escapeHtml()` é função interna que escapa `&`, `<`, `>`, `"` — garante que descrições de gastos com caracteres especiais não quebrem o HTML exportado.

### Disponibilidade por plano:
| Formato | Plano mínimo |
|---|---|
| CSV | Standard (qualquer plano pago) |
| Copiar para Planilha | Standard |
| Excel (.xls) | Pro |
| PDF | Pro |
