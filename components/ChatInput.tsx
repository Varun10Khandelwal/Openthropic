'use client';

import { useState, useRef, useCallback } from 'react';
import { Model } from '@/lib/types';
import ModelSelector from './ModelSelector';

interface ChatInputProps {
  models: Model[];
  selectedModels: string[];
  onSelectedModelsChange: (models: string[]) => void;
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({
  models,
  selectedModels,
  onSelectedModelsChange,
  onSend,
  isLoading,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!message.trim() || isLoading || selectedModels.length === 0) return;
    onSend(message.trim());
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, isLoading, selectedModels, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleRemoveModel = (modelId: string) => {
    onSelectedModelsChange(selectedModels.filter(id => id !== modelId));
  };

  const selectedModelNames = selectedModels.map(id => {
    const model = models.find(m => m.id === id);
    return { id, name: model?.name || id.split('/').pop() || id };
  });

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrapper">
        {/* Model selector bar */}
        <div className="model-selector-bar">
          <div style={{ position: 'relative' }}>
            <button
              className="model-selector-toggle"
              onClick={() => setShowModelSelector(!showModelSelector)}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
              Models ({selectedModels.length})
            </button>
            {showModelSelector && (
              <ModelSelector
                models={models}
                selectedModels={selectedModels}
                onSelectedModelsChange={onSelectedModelsChange}
                onClose={() => setShowModelSelector(false)}
              />
            )}
          </div>

          {selectedModelNames.map(({ id, name }) => (
            <span key={id} className="selected-model-tag">
              {name}
              <button className="remove-model" onClick={() => handleRemoveModel(id)} aria-label={`Remove ${name}`}>
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>

        {/* Input box */}
        <div className="chat-input-box">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={selectedModels.length === 0 ? 'Select at least one model...' : 'Type your message...'}
            rows={1}
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!message.trim() || isLoading || selectedModels.length === 0}
            aria-label="Send message"
          >
            {isLoading ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M8 1.5A6.5 6.5 0 1014.5 8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 8L13.5 2L11 8L13.5 14L2.5 8Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
