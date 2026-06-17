# Documentação da API — GastoClaro

Todas as rotas são servidas pelo mesmo processo Express que serve o frontend React. Base: `/api`.

## Convenções Gerais

### Autenticação

Rotas protegidas exigem o header:
```
Authorization: Bearer <token>
```

O token é obtido em qualquer endpoint de login/cadastro e tem validade de 30 dias.

### Formato de erro

Todos os erros retornam JSON com o campo `error`:
```json
{ "error": "Mensagem descritiva do erro." }
```

### Códigos HTTP utilizados

| Código | Significado |
|---|---|
| 200 | Sucesso |
| 201 | Recurso criado com sucesso |
| 400 | Requisição inválida (payload incorreto, validação falhou) |
| 401 | Não autenticado (token ausente ou expirado) |
| 402 | Pagamento ainda não confirmado |
| 403 | Proibido (conta banida, papel insuficiente, plano insuficiente) |
| 404 | Recurso não encontrado |
| 409 | Conflito (e-mail duplicado, conta já vinculada ao Google) |
| 429 | Limite de uso do plano atingido (cota mensal) |
| 500 | Erro interno do servidor |
| 502 | Falha em serviço externo (Stripe, Google, Claude API) |
| 503 | Serviço externo não configurado |

---

## Saúde do Servidor

### `GET /api/health`

Verifica se o servidor está respondendo.

**Auth:** Não

**Resposta 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-17T12:00:00.000Z"
}
```

---

## Autenticação (`/api/auth`)

### `GET /api/auth/config`

Retorna configurações públicas para o frontend: se o Google Sign-In e o Stripe estão habilitados.

**Auth:** Não

**Resposta 200:**
```json
{
  "googleClientId": "1234567890-abc.apps.googleusercontent.com",
  "stripeEnabled": true
}
```

Quando `googleClientId` é `null`, o botão de login com Google fica desabilitado. Quando `stripeEnabled` é `false`, o frontend usa o checkout simulado.

---

### `POST /api/auth/register`

Cria uma nova conta com e-mail e senha.

**Auth:** Não

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "minhasenhass"
}
```

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | Mínimo 2 caracteres |
| `email` | string | Formato de e-mail válido |
| `password` | string | Mínimo 6 caracteres |

**Resposta 201:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "user": {
    "id": "uuid-v4",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "plan": "free",
    "role": "user",
    "banned": false,
    "authProvider": "local",
    "createdAt": "2026-06-17T12:00:00.000Z"
  }
}
```

**Erros:**
- `400` — nome/e-mail/senha inválidos
- `409` — e-mail já cadastrado

---

### `POST /api/auth/login`

Autentica com e-mail e senha.

**Auth:** Não

**Body:**
```json
{
  "email": "joao@exemplo.com",
  "password": "minhasenhass"
}
```

**Resposta 200:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "user": { "id": "...", "name": "...", "email": "...", "plan": "...", "role": "...", "banned": false, "authProvider": "local", "createdAt": "..." }
}
```

**Erros:**
- `400` — campos ausentes
- `401` — e-mail ou senha incorretos
- `403` — conta banida

---

### `POST /api/auth/google`

Autentica ou cadastra um usuário via Google Sign-In. Recebe o credential JWT emitido pelo Google Identity Services.

**Auth:** Não

**Body:**
```json
{
  "credential": "<JWT ID Token do Google>"
}
```

**Comportamento:**
- Se o `google_id` já existe na base → login
- Se o e-mail já existe (conta local) → vincula o `google_id` (exceto para contas admin)
- Se não existe → cria nova conta Google

**Resposta 200:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "user": { "id": "...", "name": "...", "email": "...", "plan": "free", "role": "user", "banned": false, "authProvider": "google", "createdAt": "..." }
}
```

**Erros:**
- `400` — credencial ausente
- `401` — token Google inválido ou expirado; e-mail não verificado
- `403` — conta banida
- `409` — e-mail é de conta administrativa (não permite login Google automático)
- `502` — falha ao validar com a API Google
- `503` — `GOOGLE_CLIENT_ID` não configurado

---

### `GET /api/auth/me`

Retorna os dados do usuário autenticado.

**Auth:** Sim

**Resposta 200:**
```json
{
  "user": {
    "id": "uuid-v4",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "plan": "pro",
    "role": "user",
    "banned": false,
    "authProvider": "local",
    "createdAt": "2026-06-17T12:00:00.000Z"
  }
}
```

**Erros:**
- `401` — não autenticado

---

### `POST /api/auth/logout`

Invalida a sessão atual (remove o token do banco).

**Auth:** Não (mas usa o token do header para apagar a sessão, se presente)

**Resposta 200:**
```json
{ "ok": true }
```

---

## Relatórios de Gastos (`/api/reports`)

Todos os endpoints deste grupo exigem autenticação. O acesso é sempre restrito ao próprio usuário (IDOR protegido por `AND user_id = ?`).

### `POST /api/reports`

Persiste um relatório de gastos no histórico do usuário.

**Auth:** Sim

**Body:** O objeto `ExpenseReport` completo (gerado pelo endpoint `/api/ai/process-expenses`), podendo ser aninhado em `{ "report": {...} }` ou enviado diretamente como o body.

```json
{
  "report": {
    "id": "uuid",
    "total_amount": 970.00,
    "highest_category": "alimentação",
    "categorized_items": [...],
    "category_totals": [...],
    "insights": [...],
    "recommendations": [...],
    "monthReference": "junho 2026",
    "sourceText": "Jantar 850, Uber 120",
    "createdAt": "2026-06-17T12:00:00.000Z",
    "updatedAt": "2026-06-17T12:00:00.000Z"
  }
}
```

**Resposta 201:**
```json
{
  "id": "uuid-v4",
  "createdAt": "2026-06-17T12:00:00.000Z"
}
```

---

### `GET /api/reports`

Lista o histórico de relatórios do usuário, respeitando o limite de meses do plano.

**Auth:** Sim

**Resposta 200:**
```json
{
  "reports": [
    {
      "id": "uuid-v4",
      "totalAmount": 970.00,
      "highestCategory": "alimentação",
      "itemCount": 2,
      "monthReference": "junho 2026",
      "createdAt": "2026-06-17T12:00:00.000Z"
    }
  ],
  "historyMonths": 3
}
```

`historyMonths` pode ser `"ilimitado"` para planos Pro/Invest e admins.

---

### `GET /api/reports/:id`

Retorna o relatório completo (payload JSON) de um item específico do histórico.

**Auth:** Sim

**Parâmetros:** `:id` — UUID do relatório

**Resposta 200:**
```json
{
  "id": "uuid-v4",
  "createdAt": "2026-06-17T12:00:00.000Z",
  "report": {
    "id": "...",
    "total_amount": 970.00,
    "categorized_items": [
      { "id": "item-1", "description": "Jantar no restaurante", "amount": 850, "category": "alimentação" },
      { "id": "item-2", "description": "Uber Black", "amount": 120, "category": "transporte" }
    ],
    "category_totals": [
      { "category": "alimentação", "amount": 850 },
      { "category": "transporte", "amount": 120 }
    ],
    "highest_category": "alimentação",
    "insights": ["Seu maior gasto foi em alimentação, representando 87% do total."],
    "recommendations": ["Considere cozinhar em casa 2x por semana para reduzir o gasto."],
    "monthReference": "junho 2026",
    "sourceText": "Jantar 850, Uber 120"
  }
}
```

**Erros:**
- `404` — relatório não encontrado (ou pertence a outro usuário)

---

### `DELETE /api/reports/:id`

Remove um relatório do histórico do usuário.

**Auth:** Sim

**Resposta 200:**
```json
{ "ok": true }
```

---

## IA / Claude (`/api/ai`)

Todos os endpoints de IA exigem autenticação e plano mínimo `standard`. Admins têm acesso ilimitado.

### `POST /api/ai/process-expenses`

Processa texto de gastos e/ou imagens, retornando um relatório categorizado com insights e recomendações. Consome 1 unidade da cota mensal de relatórios.

**Auth:** Sim | **Plano mínimo:** Standard

**Body:**
```json
{
  "text": "Uber 35, mercado 220, farmácia 80",
  "imagesData": [
    {
      "data": "<base64 da imagem>",
      "mimeType": "image/jpeg"
    }
  ]
}
```

`text` e `imagesData` podem ser combinados. Ao menos um deve ter conteúdo.

**Resposta 200:**
```json
{
  "id": "uuid-v4",
  "createdAt": "2026-06-17T12:00:00.000Z",
  "updatedAt": "2026-06-17T12:00:00.000Z",
  "sourceText": "Uber 35, mercado 220, farmácia 80",
  "monthReference": "junho 2026",
  "raw_items": ["Uber 35", "mercado 220", "farmácia 80"],
  "categorized_items": [
    { "id": "1", "description": "Uber", "amount": 35, "category": "transporte" },
    { "id": "2", "description": "Mercado", "amount": 220, "category": "alimentação" },
    { "id": "3", "description": "Farmácia", "amount": 80, "category": "saúde" }
  ],
  "category_totals": [
    { "category": "alimentação", "amount": 220 },
    { "category": "saúde", "amount": 80 },
    { "category": "transporte", "amount": 35 }
  ],
  "total_amount": 335,
  "highest_category": "alimentação",
  "insights": ["Alimentação representa 65% dos seus gastos neste período."],
  "recommendations": ["Considere planejar refeições com antecedência para reduzir gastos com alimentação."]
}
```

**Erros:**
- `400` — payload inválido (`text` não é string ou `imagesData` não é array)
- `401` — não autenticado
- `403` — plano insuficiente
- `429` — cota mensal de relatórios esgotada
- `500` — falha na API Anthropic

---

### `POST /api/ai/generate-batch-signals`

Gera sinais de investimento (COMPRA/VENDA/NEUTRO) para um lote de ativos, baseado em variação de preço e notícias recentes.

**Auth:** Sim | **Plano mínimo:** Standard

**Body:**
```json
{
  "marketData": [
    {
      "symbol": "PETR4.SA",
      "change": 2.3,
      "news": [
        { "title": "Petrobras anuncia dividendos", "source": "InfoMoney", "publishedAt": "2026-06-17T..." }
      ]
    }
  ]
}
```

**Resposta 200:**
```json
[
  {
    "symbol": "PETR4.SA",
    "signal": "COMPRA",
    "strength": 87,
    "rationale": "Anúncio de dividendos e alta do petróleo sustentam tese de compra no curto prazo."
  }
]
```

`signal` pode ser `"COMPRA"`, `"VENDA"` ou `"NEUTRO"`. `strength` varia de 0 a 100.

**Erros:**
- `400` — `marketData` não é array
- `401` — não autenticado
- `403` — plano insuficiente

---

### `POST /api/ai/analyze-asset`

Gera análise fundamentalista aprofundada de um ativo específico em Markdown. Consome 1 unidade da cota mensal de análises de IA.

**Auth:** Sim | **Plano mínimo:** Standard

**Body:**
```json
{
  "symbol": "PETR4.SA",
  "contextData": {
    "quote": { "regularMarketPrice": 38.42, "regularMarketChangePercent": 2.3, "currency": "BRL" },
    "summary": { "summaryDetail": {...}, "defaultKeyStatistics": {...} },
    "news": [...],
    "newsSummary": { "totalItems": 8, "sources": ["InfoMoney", "Suno"] }
  }
}
```

**Resposta 200:**
```json
{
  "analysis": "## Petrobras (PETR4.SA)\n\n### Síntese da Tese\n\nA Petrobras apresenta..."
}
```

O campo `analysis` contém Markdown formatado para exibição direta em `ReactMarkdown`.

**Erros:**
- `400` — `symbol` ausente ou inválido
- `401` — não autenticado
- `403` — plano insuficiente
- `429` — cota mensal de análises esgotada
- `500` — falha na API Anthropic

---

## Pagamentos (`/api/checkout`)

### `POST /api/checkout/webhook`

Recebe eventos de webhook da Stripe. Usado internamente pela Stripe — não deve ser chamado manualmente.

**Auth:** Não (validação via HMAC-SHA256 com `STRIPE_WEBHOOK_SECRET`)

**Body:** Corpo bruto da requisição Stripe (JSON como texto)

**Header obrigatório:** `stripe-signature: t=...,v1=...`

**Eventos processados:**
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

**Resposta 200:**
```json
{ "received": true }
```

**Erros:**
- `400` — assinatura inválida ou ausente

---

### `POST /api/checkout/session`

Cria uma sessão de checkout real na Stripe e retorna a URL para redirecionamento.

**Auth:** Sim

**Body:**
```json
{ "plan": "pro" }
```

`plan` deve ser um dos IDs válidos: `"standard"`, `"pro"`, `"invest"`.

**Resposta 200 (Stripe ativo):**
```json
{
  "enabled": true,
  "url": "https://checkout.stripe.com/c/pay/...",
  "id": "cs_test_..."
}
```

**Resposta 200 (Stripe não configurado):**
```json
{ "enabled": false }
```

Quando `enabled: false`, o frontend cai automaticamente para o modo simulado.

**Erros:**
- `400` — `plan` inválido
- `401` — não autenticado
- `502` — falha ao criar sessão na Stripe

---

### `POST /api/checkout/confirm`

Confirma uma sessão de checkout paga da Stripe e ativa o plano. Operação idempotente.

**Auth:** Sim

**Body:**
```json
{ "sessionId": "cs_test_..." }
```

**Resposta 200:**
```json
{
  "ok": true,
  "plan": "pro",
  "amount": 100,
  "message": "Pagamento aprovado! Plano Pro ativado."
}
```

**Erros:**
- `400` — `sessionId` ausente
- `401` — não autenticado
- `402` — pagamento ainda pendente
- `403` — sessão não pertence ao usuário autenticado
- `502` — falha ao consultar a Stripe

---

### `POST /api/checkout`

Processa um pagamento simulado (sem Stripe). Ativa o plano imediatamente após validar os dados do cartão.

**Auth:** Sim

**Body:**
```json
{
  "plan": "standard",
  "cardNumber": "4111 1111 1111 1111",
  "cardName": "JOAO SILVA",
  "expiry": "12/28",
  "cvv": "123"
}
```

**Resposta 200:**
```json
{
  "ok": true,
  "paymentId": "uuid-v4",
  "plan": "standard",
  "amount": 60,
  "message": "Pagamento aprovado! Plano Standard ativado."
}
```

**Erros:**
- `400` — `plan` inválido, número de cartão inválido (13-19 dígitos), nome ausente, validade inválida (MM/AA), CVV inválido (3-4 dígitos)
- `401` — não autenticado

---

## Limites de Uso (`/api/usage`)

### `GET /api/usage`

Retorna o status de uso do mês atual: relatórios processados, análises de IA e janela de histórico.

**Auth:** Sim

**Resposta 200:**
```json
{
  "period": "2026-06",
  "plan": "standard",
  "reports": {
    "used": 12,
    "limit": 30
  },
  "aiAnalyses": {
    "used": 8,
    "limit": 50
  },
  "historyMonths": 3
}
```

Para planos Invest e admins, os campos `limit` e `historyMonths` retornam `"ilimitado"`.

---

## Admin (`/api/admin`)

Todos os endpoints deste grupo exigem autenticação com papel `admin` ou `superadmin`. Usuários comuns recebem `403`.

### `GET /api/admin/users`

Lista todos os usuários cadastrados.

**Auth:** Admin

**Resposta 200:**
```json
{
  "users": [
    {
      "id": "uuid-v4",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "plan": "standard",
      "role": "user",
      "banned": false,
      "authProvider": "local",
      "createdAt": "2026-06-17T12:00:00.000Z"
    }
  ]
}
```

---

### `PATCH /api/admin/users/:id`

Atualiza campos de um usuário: nome, e-mail, plano, papel ou status de banimento.

**Auth:** Admin

**Parâmetros:** `:id` — UUID do usuário alvo

**Body (todos os campos são opcionais):**
```json
{
  "name": "Novo Nome",
  "email": "novo@email.com",
  "plan": "pro",
  "role": "admin",
  "banned": false
}
```

**Regras de hierarquia:**
- Apenas `superadmin` pode alterar `role` de outros usuários
- A conta `superadmin` não pode ser modificada por outro admin
- Admins comuns não gerenciam outros admins
- Deve sempre restar ao menos um admin ativo no sistema

**Valores válidos:**
- `plan`: `"free"`, `"standard"`, `"pro"`, `"invest"`
- `role`: `"user"`, `"admin"`

**Resposta 200:**
```json
{
  "user": { "id": "...", "name": "...", "email": "...", "plan": "pro", "role": "admin", "banned": false, "authProvider": "local", "createdAt": "..." }
}
```

**Erros:**
- `400` — campo inválido, auto-banimento, sistema sem admin ativo
- `403` — permissões insuficientes
- `404` — usuário não encontrado

---

### `DELETE /api/admin/users/:id`

Remove um usuário permanentemente (cascade apaga sessões, relatórios, pagamentos e contadores).

**Auth:** Admin

**Parâmetros:** `:id` — UUID do usuário

**Restrições:**
- Não é possível excluir a si mesmo
- Não é possível excluir a conta `superadmin`
- Admins comuns não podem excluir outros admins
- Deve restar ao menos um admin ativo

**Resposta 200:**
```json
{ "ok": true }
```

---

## Mercado / Investimentos

### `GET /api/market-data`

Retorna cotações em tempo real de todos os ativos monitorados (16 BR + 10 US) com notícias associadas. Sem autenticação.

**Auth:** Não

**Ativos BR:** `^BVSP`, `USDBRL=X`, `BTC-USD`, `PETR4.SA`, `VALE3.SA`, `ITUB4.SA`, `BBDC4.SA`, `MGLU3.SA`, `WEGE3.SA`, `ABEV3.SA`, `B3SA3.SA`, `ELET3.SA`, `RENT3.SA`, `BBAS3.SA`, `SUZB3.SA`, `RADL3.SA`

**Ativos US:** `^GSPC`, `^IXIC`, `^DJI`, `AAPL`, `MSFT`, `NVDA`, `GOOGL`, `AMZN`, `TSLA`, `META`

**Resposta 200:**
```json
[
  {
    "symbol": "PETR4.SA",
    "name": "Petrobras PN",
    "price": 38.42,
    "change": 2.3,
    "currency": "BRL",
    "region": "BR",
    "news": [
      {
        "title": "Petrobras anuncia dividendos",
        "source": "InfoMoney",
        "url": "https://...",
        "summary": "...",
        "publishedAt": "2026-06-17T10:00:00.000Z",
        "provider": "rss",
        "matchedTerms": ["Petrobras", "PETR4"]
      }
    ]
  }
]
```

`change` é a variação percentual. `region` é `"BR"` ou `"US"`.

**Erros:**
- `500` — falha crítica ao buscar dados (Yahoo Finance indisponível)

---

### `GET /api/historical/:symbol`

Retorna dados históricos de preço dos últimos 90 dias de um ativo.

**Auth:** Não

**Parâmetros:** `:symbol` — ticker do ativo (ex: `PETR4.SA`, `AAPL`, `^BVSP`)

**Resposta 200:**
```json
[
  {
    "date": "2026-03-19",
    "open": 37.10,
    "high": 37.80,
    "low": 36.90,
    "close": 37.50,
    "volume": 12345678
  }
]
```

**Erros:**
- `500` — símbolo inválido ou Yahoo Finance indisponível

---

### `GET /api/asset-context/:symbol`

Retorna dados completos de um ativo para alimentar a análise de IA: cotação atual, dados fundamentalistas, notícias.

**Auth:** Não

**Parâmetros:** `:symbol` — ticker do ativo

**Resposta 200:**
```json
{
  "symbol": "PETR4.SA",
  "quote": {
    "regularMarketPrice": 38.42,
    "regularMarketChangePercent": 2.3,
    "shortName": "Petrobras PN",
    "currency": "BRL"
  },
  "summary": {
    "summaryDetail": { "trailingPE": 5.2, "dividendYield": 0.14 },
    "defaultKeyStatistics": { "forwardEps": 7.3 },
    "financialData": { "totalRevenue": 500000000 },
    "assetProfile": { "industry": "Oil & Gas" }
  },
  "news": [...],
  "newsSummary": {
    "totalItems": 8,
    "sources": ["InfoMoney", "Suno Notícias"],
    "sourceCounts": { "InfoMoney": 3, "Suno Notícias": 5 },
    "latestPublishedAt": "2026-06-17T10:00:00.000Z"
  }
}
```

`summary` pode ser `null` para ativos sem dados fundamentalistas disponíveis.

**Erros:**
- `500` — falha ao buscar dados do ativo
