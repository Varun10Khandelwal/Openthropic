'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatThread from '@/components/ChatThread';
import ChatInput from '@/components/ChatInput';
import { Model, Message, ResponseLog } from '@/lib/types';
import { DEFAULT_SELECTED_MODELS } from '@/lib/constants';

interface StreamingResponse {
  [modelId: string]: {
    content: string;
    done: boolean;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    latency_ms?: number;
    cost_usd?: number;
    message_id?: string;
  };
}

const STARTER_PROMPTS = [
  {
    icon: '⚡',
    title: 'Reasoning Shootout',
    desc: 'Compare step-by-step logic across Claude, GPT-4o & DeepSeek',
    prompt: 'Write a Python function to solve the Traveling Salesperson Problem using dynamic programming with bitmasking, and explain the time complexity.',
  },
  {
    icon: '📊',
    title: 'Product Strategy',
    desc: 'Evaluate product frameworks across different AI perspectives',
    prompt: 'Explain the difference between a Product Manager and a Product Owner, with 3 concrete real-world scenario examples.',
  },
  {
    icon: '✍️',
    title: 'Creative Writing',
    desc: 'Benchmark tone, style, and vocabulary differences',
    prompt: 'Write a poetic and evocative 3-paragraph opening scene for a neo-noir mystery set in a rainy Kyoto alley in 2088.',
  },
  {
    icon: '🔬',
    title: 'Deep Explanation',
    desc: 'Test nuance and conceptual clarity',
    prompt: 'Explain Quantum Superposition and Entanglement as if I am a curious 16-year-old with analogies.',
  },
];

function ChatContent() {
  const searchParams = useSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(
    searchParams.get('id')
  );
  const conversationIdRef = useRef<string | null>(conversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_SELECTED_MODELS);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamingResponses, setStreamingResponses] = useState<StreamingResponse>({});
  const [responseLogs, setResponseLogs] = useState<Record<string, ResponseLog[]>>({});
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync
  useEffect(() => {
    const urlId = searchParams.get('id');
    setConversationId(urlId);
    conversationIdRef.current = urlId;
  }, [searchParams]);

  // Fetch models on mount
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch conversation messages when conversationId changes
  useEffect(() => {
    const activeId = conversationId;
    if (!activeId) {
      setMessages([]);
      return;
    }
    
    let isMounted = true;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeId)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (isMounted && data) setMessages(data);
        });

      supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', activeId)
        .then(({ data: msgData }) => {
          if (isMounted && msgData && msgData.length > 0) {
            const messageIds = msgData.map(m => m.id);
            supabase
              .from('response_logs')
              .select('*')
              .in('message_id', messageIds)
              .then(({ data: logs }) => {
                if (isMounted && logs) {
                  const grouped: Record<string, ResponseLog[]> = {};
                  logs.forEach(log => {
                    if (!grouped[log.message_id]) grouped[log.message_id] = [];
                    grouped[log.message_id].push(log);
                  });
                  setResponseLogs(grouped);
                }
              });
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, streamingResponses]);

  const handleSend = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setStreamingResponses({});

    // Optimistically add user message to UI
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationIdRef.current || '',
      role: 'user',
      content: messageText,
      model: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationIdRef.current,
          message: messageText,
          models: selectedModels,
        }),
      });

      if (!response.ok) {
        let errDetail = '';
        try {
          const errJson = await response.json();
          errDetail = errJson.error || errJson.message || '';
        } catch {
          errDetail = await response.text();
        }

        if (response.status === 401) {
          setErrorMessage('Session expired. Please sign in again.');
          setTimeout(() => { window.location.href = '/login'; }, 2000);
          return;
        }

        setErrorMessage(errDetail || `Request failed with status ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'init') {
              const newConvId = parsed.conversation_id;
              conversationIdRef.current = newConvId;
              setConversationId(newConvId);
              window.history.replaceState(null, '', `/chat?id=${newConvId}`);
            } else if (parsed.type === 'chunk') {
              setStreamingResponses(prev => ({
                ...prev,
                [parsed.model]: {
                  ...prev[parsed.model],
                  content: (prev[parsed.model]?.content || '') + parsed.content,
                  done: false,
                },
              }));
            } else if (parsed.type === 'done') {
              setStreamingResponses(prev => ({
                ...prev,
                [parsed.model]: {
                  ...prev[parsed.model],
                  done: true,
                  usage: parsed.usage,
                  latency_ms: parsed.latency_ms,
                  cost_usd: parsed.cost_usd,
                  message_id: parsed.message_id,
                },
              }));
            } else if (parsed.type === 'error') {
              setStreamingResponses(prev => ({
                ...prev,
                [parsed.model]: {
                  content: parsed.content,
                  done: true,
                },
              }));
            }
          } catch {
            // Skip malformed chunk
          }
        }
      }

      // After stream finishes, refresh messages from DB
      const activeConvId = conversationIdRef.current;
      if (activeConvId) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await new Promise(r => setTimeout(r, 600));

        const { data: freshMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConvId)
          .order('created_at', { ascending: true });
        
        if (freshMessages && freshMessages.length > 0) {
          setMessages(freshMessages);
        }

        const msgIds = (freshMessages || []).map(m => m.id);
        if (msgIds.length > 0) {
          const { data: logs } = await supabase
            .from('response_logs')
            .select('*')
            .in('message_id', msgIds);
          if (logs) {
            const grouped: Record<string, ResponseLog[]> = {};
            logs.forEach(log => {
              if (!grouped[log.message_id]) grouped[log.message_id] = [];
              grouped[log.message_id].push(log);
            });
            setResponseLogs(grouped);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      setStreamingResponses({});
    }
  }, [selectedModels, isLoading]);

  return (
    <div className="chat-page">
      {errorMessage && (
        <div style={{
          background: 'rgba(220, 38, 38, 0.08)',
          color: 'var(--error)',
          padding: '10px 18px',
          fontSize: '0.85rem',
          borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
        }}>
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} style={{ fontWeight: 600, fontSize: '0.9rem' }}>×</button>
        </div>
      )}

      <div className="chat-thread-container" ref={threadRef}>
        {messages.length === 0 && !isLoading ? (
          <div className="chat-empty">
            <div className="hero-pill">
              <span className="hero-pulse-dot" />
              <span>Multi-LLM Intelligence Arena</span>
            </div>
            
            <h1 className="chat-empty-title">Openthropic</h1>
            <p className="chat-empty-subtitle">
              Send your message to Claude, GPT-4o, Gemini, DeepSeek & Llama simultaneously. Compare latency, tokens, cost, and answers side by side.
            </p>

            {/* Interactive Prompt Starters */}
            <div className="prompt-grid">
              {STARTER_PROMPTS.map((item, idx) => (
                <div
                  key={idx}
                  className="prompt-card"
                  onClick={() => handleSend(item.prompt)}
                >
                  <div className="prompt-card-icon">{item.icon}</div>
                  <div className="prompt-card-title">{item.title}</div>
                  <div className="prompt-card-desc">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ChatThread
            messages={messages}
            streamingResponses={streamingResponses}
            responseLogs={responseLogs}
          />
        )}
      </div>
      <ChatInput
        models={models}
        selectedModels={selectedModels}
        onSelectedModelsChange={setSelectedModels}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="chat-page"><div className="chat-empty"><h1 className="chat-empty-title">Openthropic</h1></div></div>}>
      <ChatContent />
    </Suspense>
  );
}
