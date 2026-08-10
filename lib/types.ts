export interface Model {
  id: string;
  name: string;
  provider: string;
  pricing: {
    prompt: number;   // cost per token
    completion: number; // cost per token
  };
  context_length: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: string;
}

export interface ResponseLog {
  id: string;
  message_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  created_at: string;
}

export interface StreamChunk {
  model: string;
  content: string;
  done: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms?: number;
}

export interface ChatRequest {
  conversationId: string | null;
  message: string;
  models: string[];
}
