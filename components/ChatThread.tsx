'use client';

import { useMemo, useState } from 'react';
import { Message, ResponseLog } from '@/lib/types';
import MessageMetrics from './MessageMetrics';
import ResponseModal, { ModalResponseItem } from './ResponseModal';
import { CURATED_MODELS } from '@/lib/constants';

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

interface ChatThreadProps {
  messages: Message[];
  streamingResponses: StreamingResponse;
  responseLogs: Record<string, ResponseLog[]>;
}

export default function ChatThread({ messages, streamingResponses, responseLogs }: ChatThreadProps) {
  const [modalData, setModalData] = useState<{
    items: ModalResponseItem[];
    initialIndex: number;
    userPrompt: string;
  } | null>(null);

  // Group messages: user message followed by its assistant responses
  const groupedMessages = useMemo(() => {
    const groups: { userMessage: Message; assistantMessages: Message[] }[] = [];
    let currentGroup: { userMessage: Message; assistantMessages: Message[] } | null = null;

    for (const msg of messages) {
      if (msg.role === 'user') {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { userMessage: msg, assistantMessages: [] };
      } else if (msg.role === 'assistant' && currentGroup) {
        currentGroup.assistantMessages.push(msg);
      }
    }
    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [messages]);

  const hasStreamingResponses = Object.keys(streamingResponses).length > 0;

  const getModelInfo = (modelId: string) => {
    const found = CURATED_MODELS.find(m => m.id === modelId);
    if (found) return found;

    const lower = modelId.toLowerCase();
    let provider = 'AI Model';
    if (lower.includes('anthropic') || lower.includes('claude')) provider = 'Anthropic';
    else if (lower.includes('openai') || lower.includes('gpt')) provider = 'OpenAI';
    else if (lower.includes('google') || lower.includes('gemini')) provider = 'Google';
    else if (lower.includes('deepseek')) provider = 'DeepSeek';
    else if (lower.includes('meta') || lower.includes('llama')) provider = 'Meta';
    else if (lower.includes('mistral')) provider = 'Mistral';

    let simpleName = modelId.split('/').pop() || modelId;
    if (simpleName.startsWith('claude-')) simpleName = simpleName.replace('claude-', 'Claude ');
    if (simpleName.startsWith('gemini-')) simpleName = simpleName.replace('gemini-', 'Gemini ');
    if (simpleName.startsWith('gpt-')) simpleName = simpleName.replace('gpt-', 'GPT-');

    return {
      id: modelId,
      name: simpleName,
      provider,
    };
  };

  const getPreviewText = (text: string, maxChars = 160) => {
    if (!text) return '';
    // Strip markdown formatting headers for the teaser
    const clean = text.replace(/^#+\s+/gm, '').trim();
    if (clean.length <= maxChars) return clean;
    const trimmed = clean.slice(0, maxChars);
    const lastSpace = trimmed.lastIndexOf(' ');
    return (lastSpace > 60 ? trimmed.slice(0, lastSpace) : trimmed) + '...';
  };

  const openFullResponse = (
    assistantMessages: Message[],
    clickedIndex: number,
    prompt: string
  ) => {
    const items: ModalResponseItem[] = assistantMessages.map(m => ({
      id: m.id,
      modelId: m.model || '',
      content: m.content,
      logs: responseLogs[m.id],
    }));

    setModalData({
      items,
      initialIndex: clickedIndex,
      userPrompt: prompt,
    });
  };

  return (
    <>
      <div className="chat-thread">
        {groupedMessages.map((group, i) => {
          const isLatest = i === groupedMessages.length - 1;
          const userText = group.userMessage.content;

          return (
            <div key={group.userMessage.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* User Prompt Bubble */}
              <div className="message-user">
                <div className="message-user-bubble">
                  {userText}
                </div>
              </div>

              {/* Completed Assistant Teaser Cards Grid */}
              {group.assistantMessages.length > 0 && (
                <div className="message-assistant-grid">
                  {group.assistantMessages.map((msg, msgIdx) => {
                    const logs = responseLogs[msg.id];
                    const modelId = msg.model || 'Unknown';
                    const modelInfo = getModelInfo(modelId);
                    const log = logs?.[0];
                    const isErrorMsg = msg.content.startsWith('⚠️');
                    const preview = getPreviewText(msg.content);
                    const wordCount = msg.content.trim().split(/\s+/).filter(Boolean).length;

                    return (
                      <div
                        className="message-teaser-card"
                        key={msg.id}
                        data-provider={modelInfo.provider}
                        onClick={() => !isErrorMsg && openFullResponse(group.assistantMessages, msgIdx, userText)}
                      >
                        {/* Header Row */}
                        <div className="message-model-header">
                          <div className="model-badge-group">
                            <span className={`provider-dot ${modelInfo.provider.toLowerCase()}`} />
                            <span className="message-model-badge">{modelInfo.name}</span>
                            <span className="provider-sublabel">· {modelInfo.provider}</span>
                          </div>

                          <div className="message-header-actions" onClick={(e) => e.stopPropagation()}>
                            {log && log.latency_ms > 0 && (
                              <span className="metric-pill latency" title="Wall-clock latency">
                                ⚡ {log.latency_ms < 1000 ? `${log.latency_ms}ms` : `${(log.latency_ms / 1000).toFixed(1)}s`}
                              </span>
                            )}
                            {log && log.cost_usd > 0 && (
                              <span className="metric-pill cost" title="Estimated cost in USD">
                                ${log.cost_usd.toFixed(5)}
                              </span>
                            )}
                            {logs && logs.length > 0 && (
                              <MessageMetrics logs={logs} />
                            )}
                          </div>
                        </div>

                        {/* Teaser snippet body */}
                        <div className="message-teaser-body">
                          {isErrorMsg ? (
                            <div className="teaser-error-box">
                              {msg.content}
                            </div>
                          ) : (
                            <p className="teaser-text">{preview}</p>
                          )}
                        </div>

                        {/* Footer Action */}
                        {!isErrorMsg && (
                          <div className="message-teaser-footer">
                            <span className="read-more-link">
                              Read Full Answer ↗
                            </span>
                            <span className="word-count">
                              ~{wordCount} words
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Streaming Responses in real-time */}
              {isLatest && hasStreamingResponses && (
                <div className="message-assistant-grid">
                  {Object.entries(streamingResponses).map(([modelId, resp]) => {
                    const modelInfo = getModelInfo(modelId);
                    const isErrorMsg = resp.content.startsWith('⚠️');

                    return (
                      <div
                        className={`message-teaser-card ${!resp.done ? 'message-streaming' : ''}`}
                        key={modelId}
                        data-provider={modelInfo.provider}
                      >
                        <div className="message-model-header">
                          <div className="model-badge-group">
                            <span className={`provider-dot ${modelInfo.provider.toLowerCase()}`} />
                            <span className="message-model-badge">{modelInfo.name}</span>
                            <span className="provider-sublabel">· {modelInfo.provider}</span>
                          </div>

                          <div className="message-header-actions">
                            {resp.latency_ms && resp.latency_ms > 0 ? (
                              <span className="metric-pill latency">
                                ⚡ {resp.latency_ms < 1000 ? `${resp.latency_ms}ms` : `${(resp.latency_ms / 1000).toFixed(1)}s`}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="message-teaser-body">
                          {isErrorMsg ? (
                            <div className="teaser-error-box">
                              {resp.content}
                            </div>
                          ) : (
                            <p className="teaser-text">
                              {resp.content ? getPreviewText(resp.content, 180) : (
                                <span className="loading-dots">
                                  <span></span><span></span><span></span>
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        {resp.done && !isErrorMsg && (
                          <div className="message-teaser-footer">
                            <span className="read-more-link">Done ↗</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full Answer Modal */}
      {modalData && (
        <ResponseModal
          items={modalData.items}
          initialIndex={modalData.initialIndex}
          userPrompt={modalData.userPrompt}
          onClose={() => setModalData(null)}
        />
      )}
    </>
  );
}
