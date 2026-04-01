import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseReport } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenAI({ apiKey });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    raw_items: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de itens extraídos do texto original"
    },
    categorized_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING }
        },
        required: ["id", "description", "amount", "category"]
      }
    },
    category_totals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          amount: { type: Type.NUMBER }
        },
        required: ["category", "amount"]
      }
    },
    total_amount: { type: Type.NUMBER },
    highest_category: { type: Type.STRING },
    insights: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: [
    "raw_items", 
    "categorized_items", 
    "category_totals", 
    "total_amount", 
    "highest_category", 
    "insights", 
    "recommendations"
  ]
};

export async function processExpenses(text: string, imagesData?: { data: string, mimeType: string }[]): Promise<ExpenseReport> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analise o seguinte conteúdo de gastos pessoais e extraia as informações de forma estruturada.
    ${text ? `Texto fornecido: "${text}"` : "Analise as imagens fornecidas (faturas, extratos ou comprovantes)."}
    
    Categorias permitidas: alimentação, transporte, moradia, saúde, lazer, educação, compras, outros.
    Se não tiver certeza da categoria, use "outros".
    Identifique valores monetários e descrições.
    Gere insights sobre os gastos e recomendações para economizar.
    
    Se houver imagens, extraia todos os gastos visíveis nelas, ignorando pagamentos de fatura (que são apenas transferências) e focando em compras reais.
    Combine os dados do texto e de todas as imagens em um único relatório consolidado.
  `;

  const parts: any[] = [{ text: prompt }];
  
  if (imagesData && imagesData.length > 0) {
    imagesData.forEach(img => {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      });
    });
  }

  const response = await genAI.models.generateContent({
    model,
    contents: [{ parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as any
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  return {
    ...result,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceText: text,
    monthReference: new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  };
}

export async function generateBatchSignals(marketData: any[]): Promise<any[]> {
  const model = "gemini-3-flash-preview";
  
  const assetsWithNews = marketData.filter(d => d.news && d.news.length > 0);
  const assetsWithoutNews = marketData.filter(d => !d.news || d.news.length === 0);

  let aiResults: any[] = [];

  if (assetsWithNews.length > 0) {
    const prompt = `
Você é um analista fundamentalista e macroeconômico.
Analise os seguintes ativos, suas variações de preço e as manchetes de notícias recentes.
Para cada ativo, determine o sinal (COMPRA, VENDA ou NEUTRO) e a força da tese (0 a 100).
A decisão DEVE ser baseada no contexto das notícias e cenário macro, não apenas no preço.

Dados dos ativos:
${JSON.stringify(assetsWithNews.map(d => ({ symbol: d.symbol, change: d.change, news: d.news })), null, 2)}

Retorne EXATAMENTE um array JSON neste formato, sem formatação markdown:
[
  {
    "symbol": "PETR4.SA",
    "signal": "COMPRA",
    "strength": 85,
    "rationale": "Justificativa curta (1 frase) baseada nas notícias e macro."
  }
]
    `;

    try {
      const response = await genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });
      aiResults = JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Error generating/parsing batch signals", e);
    }
  }

  const defaultResults = assetsWithoutNews.map(d => ({
    symbol: d.symbol,
    signal: "NEUTRO",
    strength: 50,
    rationale: "Analisando dados..."
  }));

  return [...aiResults, ...defaultResults];
}

export async function analyzeAsset(symbol: string, contextData: any): Promise<string> {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
Você é o motor analítico principal de uma plataforma de investimentos com IA.

Sua função é analisar ativos financeiros, principalmente ações, mas também podendo avaliar ETFs, índices, bancos, seguradoras, empresas alavancadas, empresas pagadoras de dividendos, empresas em crescimento, empresas expostas a commodities, ativos com evento societário relevante e instrumentos de renda fixa quando os dados forem fornecidos.

Seu papel é gerar uma análise híbrida, profunda e profissional.

Você NÃO é um leitor de gráfico.
Você NÃO pode basear a análise apenas em candles, RSI, MACD, suportes, resistências, volume ou padrões visuais.
A análise técnica existe apenas como camada complementar de timing, momentum, volatilidade, confirmação e risco de entrada/saída.
A tese principal deve nascer de fundamentos, valuation, macroeconomia, risco setorial, governança, informação pública relevante, notícias, risco-retorno e contexto qualitativo.

OBJETIVO
Para cada ativo analisado, você deve:
- avaliar se a tese é atrativa ou não no momento;
- explicar se o ativo parece comprável, observável ou evitável;
- estimar faixas de preço plausíveis, não um número mágico rígido;
- produzir cenários otimista, base e pessimista;
- indicar a força da tese;
- indicar o nível de confiança da leitura;
- apontar o que sustenta a tese;
- apontar o que enfraquece ou invalida a tese;
- transformar dados qualitativos e notícias em raciocínio econômico e financeiro objetivo;
- manter linguagem clara, elegante, profissional e prudente.

FILOSOFIA DE MERCADO
Assuma uma visão próxima da hipótese semi-forte de eficiência de mercado:
- os preços tendem a incorporar rapidamente as informações públicas relevantes;
- portanto, balanços, guidance, fatos relevantes, notícias, contexto macro e eventos regulatórios devem ser levados a sério;
- o mercado pode errar no curto prazo, exagerar ou subprecificar risco, mas informação pública relevante não pode ser ignorada;
- nunca use nem simule uso de informação privilegiada;
- nunca trate rumor sem confirmação como fato;
- nunca produza “certeza”, apenas avaliação probabilística.

HIERARQUIA DA ANÁLISE
Dê mais peso para:
1. fundamentos;
2. valuation;
3. macroeconomia e setor;
4. governança, assimetria informacional e fatores qualitativos;
5. risco-retorno;
6. análise técnica como confirmação.

NÚCLEO DA ANÁLISE
1) FUNDAMENTOS: Avalie crescimento de receita, qualidade do lucro, margens, ROE, ROIC, geração de caixa, endividamento.
2) VALUATION: Avalie P/L, P/VP, EV/EBITDA, dividend yield, comparativos históricos.
3) DIVIDENDOS: Considere consistência e sustentabilidade.
4) MACRO E SETOR: Juros, inflação, câmbio, ciclo econômico, regulação.
5) GOVERNANÇA: Credibilidade, alinhamento, histórico de alocação de capital.
6) NOTÍCIAS: Use intensamente o bloco NEWS_CONTEXT. Priorize fatos confirmados, separe ruído de mudança estrutural.
7) TÉCNICO: Apenas para confirmar tendência, momentum ou divergência.
8) RISCO/RETORNO: Avalie se o prêmio compensa o risco.

FORMATO DA RESPOSTA
NÃO responda em JSON.
NÃO entregue tabela crua.
NÃO escreva de forma excessivamente acadêmica.
Responda em português claro, premium, direto e pronto para ser exibido em uma interface elegante de investimentos usando Markdown.

ESTRUTURA OBRIGATÓRIA (Use Markdown para formatar):

# [Nome do ativo] - [Leitura resumida]

**Radar**
[Até 3 frases resumindo a oportunidade]

**Sinal:** [Compra | Compra com cautela | Observação | Evitar | Dados insuficientes]
**Sentimento:** [Muito otimista | Otimista | Neutro | Cauteloso | Pessimista]
**Força da tese:** [Fraca | Moderada | Forte | Muito forte]

### Resumo da tese
[Explique a lógica central em 1 ou 2 parágrafos]

### Pilares da análise
- **Fundamentos:** ...
- **Valuation:** ...
- **Macro e setor:** ...
- **Governança e qualitativo:** ...
- **Notícias recentes:** ...
- **Técnico:** ...

### O que sustenta a tese
- [Vetor positivo 1]
- [Vetor positivo 2]

### O que enfraquece a tese
- [Risco/Fragilidade 1]
- [Risco/Fragilidade 2]

### Faixa provável
- **Faixa conservadora:** ...
- **Faixa base:** ...
- **Faixa otimista:** ...

### Cenários
- **Cenário otimista:** [Explique o que teria que acontecer]
- **Cenário base:** [Explique o cenário mais provável]
- **Cenário pessimista:** [Explique o principal risco de decepção]

**Confiança da análise:** [Baixa | Moderada | Alta]
[Explique em poucas linhas por que a confiança ficou nesse nível]

### Conclusão final
[Feche com uma frase objetiva, elegante e prudente]

CRITÉRIO FINAL DE DECISÃO
“Compra” só quando houver fundamentos aceitáveis, valuation defensável, risco entendido e assimetria positiva plausível.
“Compra com cautela” quando houver upside, mas com riscos relevantes.
“Observação” quando a tese existir, mas depender de confirmação.
“Evitar” quando a relação risco-retorno estiver ruim.
“Dados insuficientes” quando faltarem insumos essenciais.

ESTILO
Soe como um analista híbrido: fundamentalista, probabilístico, atento a macro e notícias, disciplinado, cético e orientado a risco-retorno. Nunca soe como alguém tentando vender call de compra.
  `;

  const prompt = `
Analise o ativo ${symbol} com base nos dados fornecidos abaixo.

ASSET_CONTEXT:
${JSON.stringify(contextData.quote || {}, null, 2)}

FUNDAMENTAL_DATA & VALUATION:
${JSON.stringify(contextData.summary || {}, null, 2)}

NEWS_CONTEXT:
${JSON.stringify(contextData.news || [], null, 2)}

Se algum bloco estiver vazio ou incompleto, indique isso na sua análise e ajuste a confiança adequadamente.
  `;

  const response = await genAI.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      temperature: 0.2,
    }
  });

  return response.text || "Não foi possível gerar a análise.";
}
