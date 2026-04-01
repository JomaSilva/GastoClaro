import type { ExpenseReport } from "../types";

type ImagePayload = {
  data: string;
  mimeType: string;
};

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    try {
      const parsed = JSON.parse(rawBody) as { error?: string };
      throw new Error(parsed.error || `Erro ${response.status} ao comunicar com o servidor.`);
    } catch {
      throw new Error(rawBody || `Erro ${response.status} ao comunicar com o servidor.`);
    }
  }

  return rawBody ? JSON.parse(rawBody) as T : {} as T;
}

export async function processExpenses(text: string, imagesData: ImagePayload[] = []): Promise<ExpenseReport> {
  return postJson<ExpenseReport>("/api/ai/process-expenses", {
    text,
    imagesData,
  });
}

export async function generateBatchSignals(marketData: any[]): Promise<any[]> {
  return postJson<any[]>("/api/ai/generate-batch-signals", { marketData });
}

export async function analyzeAsset(symbol: string, contextData: any): Promise<string> {
  const response = await postJson<{ analysis: string }>("/api/ai/analyze-asset", {
    symbol,
    contextData,
  });

  return response.analysis || "Não foi possível gerar a análise.";
}
