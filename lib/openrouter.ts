import { Model } from './types';
import { CURATED_MODELS } from './constants';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export async function fetchModels(): Promise<Model[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  // Default list mapped with realistic pricing fallback
  const baseMap = new Map<string, Model>(
    CURATED_MODELS.map(m => [
      m.id,
      {
        id: m.id,
        name: m.name,
        provider: m.provider,
        pricing: {
          prompt: m.id.includes(':free') ? 0 : m.id.includes('claude') ? 0.000003 : m.id.includes('gpt-4o-mini') ? 0.00000015 : 0.000001,
          completion: m.id.includes(':free') ? 0 : m.id.includes('claude') ? 0.000015 : m.id.includes('gpt-4o-mini') ? 0.0000006 : 0.000005,
        },
        context_length: 128000,
      }
    ])
  );

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return Array.from(baseMap.values());
  }

  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return Array.from(baseMap.values());
    }

    const data = await res.json();
    const apiModels = data.data || [];

    apiModels.forEach((m: Record<string, unknown>) => {
      const modelId = m.id as string;
      const pricing = m.pricing as Record<string, string>;
      if (baseMap.has(modelId)) {
        const existing = baseMap.get(modelId)!;
        baseMap.set(modelId, {
          ...existing,
          pricing: {
            prompt: parseFloat(pricing?.prompt || '0'),
            completion: parseFloat(pricing?.completion || '0'),
          },
          context_length: (m.context_length as number) || existing.context_length,
        });
      }
    });

    return Array.from(baseMap.values());
  } catch (error) {
    console.error('Error fetching live models from OpenRouter:', error);
    return Array.from(baseMap.values());
  }
}

export async function streamChatCompletion(
  model: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal
): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  return fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Openthropic Arena',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048, // Prevents OpenRouter 402 high token reservation error
      temperature: 0.7,
      stream: true,
    }),
    signal,
  });
}

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricing: { prompt: number; completion: number }
): number {
  return promptTokens * (pricing?.prompt || 0) + completionTokens * (pricing?.completion || 0);
}
