'use client';

import { useEffect, useState } from 'react';
import { ResponseLog } from '@/lib/types';
import { CURATED_MODELS } from '@/lib/constants';

export interface ModalResponseItem {
  id: string;
  modelId: string;
  content: string;
  logs?: ResponseLog[];
  latencyMs?: number;
  costUsd?: number;
  tokens?: number;
}

interface ResponseModalProps {
  items: ModalResponseItem[];
  initialIndex: number;
  userPrompt: string;
  onClose: () => void;
}

export default function ResponseModal({
  items,
  initialIndex,
  userPrompt,
  onClose,
}: ResponseModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);

  const currentItem = items[currentIndex] || items[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, onClose]);

  if (!currentItem) return null;

  const getModelInfo = (modelId: string) => {
    const found = CURATED_MODELS.find((m) => m.id === modelId);
    if (found) return found;

    const lower = modelId.toLowerCase();
    let provider = 'AI Provider';
    if (lower.includes('anthropic') || lower.includes('claude')) provider = 'Anthropic';
    else if (lower.includes('openai') || lower.includes('gpt')) provider = 'OpenAI';
    else if (lower.includes('google') || lower.includes('gemini')) provider = 'Google';
    else if (lower.includes('deepseek')) provider = 'DeepSeek';
    else if (lower.includes('meta') || lower.includes('llama')) provider = 'Meta';
    else if (lower.includes('mistral')) provider = 'Mistral';

    const simple = modelId.split('/').pop() || modelId;
    return {
      id: modelId,
      name: simple.charAt(0).toUpperCase() + simple.slice(1),
      provider,
    };
  };

  const modelInfo = getModelInfo(currentItem.modelId);
  const log = currentItem.logs?.[0];
  const latency = currentItem.latencyMs || log?.latency_ms;
  const cost = currentItem.costUsd || log?.cost_usd;
  const totalTokens = log?.total_tokens || (log ? log.prompt_tokens + log.completion_tokens : 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentItem.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            {/* Model Switcher Tabs */}
            <div className="modal-model-tabs">
              {items.map((it, idx) => {
                const info = getModelInfo(it.modelId);
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={it.id || it.modelId}
                    className={`modal-model-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    <span className={`provider-dot ${info.provider.toLowerCase()}`} />
                    <span>{info.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="modal-header-right">
            <button className="modal-action-btn copy" onClick={handleCopy}>
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>

        {/* User Prompt Context Bar */}
        <div className="modal-prompt-bar">
          <span className="modal-prompt-label">Prompt:</span>
          <span className="modal-prompt-text">{userPrompt}</span>
        </div>

        {/* Metrics Banner */}
        <div className="modal-metrics-bar">
          <div className="modal-metric">
            <span className="label">Model</span>
            <span className="val">{modelInfo.name} ({modelInfo.provider})</span>
          </div>
          {latency && (
            <div className="modal-metric">
              <span className="label">Latency</span>
              <span className="val highlight">⚡ {latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(2)}s`}</span>
            </div>
          )}
          {cost !== undefined && cost > 0 && (
            <div className="modal-metric">
              <span className="label">Cost</span>
              <span className="val green">💰 ${cost.toFixed(5)}</span>
            </div>
          )}
          {totalTokens > 0 && (
            <div className="modal-metric">
              <span className="label">Tokens</span>
              <span className="val">{totalTokens.toLocaleString()} tokens</span>
            </div>
          )}
        </div>

        {/* Full Answer Body */}
        <div className="modal-body">
          <div className="modal-answer-text">
            {currentItem.content}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="modal-footer-nav">
            <button
              className="nav-arrow-btn"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
              title="Previous model (←)"
            >
              ← Previous Model
            </button>
            <span className="modal-footer-counter">
              {currentIndex + 1} of {items.length}
            </span>
            <button
              className="nav-arrow-btn"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
              title="Next model (→)"
            >
              Next Model →
            </button>
          </div>

          <button className="btn-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
