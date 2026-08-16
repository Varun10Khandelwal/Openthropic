export const CURATED_MODELS = [
  // Anthropic Claude
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },

  // Google Gemini
  { id: 'google/gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'Google' },
  { id: 'google/gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', provider: 'Google' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', provider: 'Google' },

  // OpenAI
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/o3-mini', name: 'o3 Mini (Reasoning)', provider: 'OpenAI' },
  { id: 'openai/o1', name: 'o1 (Reasoning)', provider: 'OpenAI' },

  // DeepSeek
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)', provider: 'DeepSeek' },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'DeepSeek' },

  // Meta Llama
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta' },

  // Mistral
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large', provider: 'Mistral' },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', provider: 'Mistral' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen' },
];

export const DEFAULT_SELECTED_MODELS = [
  'anthropic/claude-3-haiku',
  'google/gemini-3.6-flash',
  'openai/gpt-4o-mini',
  'deepseek/deepseek-chat',
];

export const APP_NAME = 'Openthropic';
export const APP_DESCRIPTION = 'Multi-LLM Chat & Intelligence Arena';
