'use client';

import { useState, useMemo } from 'react';
import { Model } from '@/lib/types';

interface ModelSelectorProps {
  models: Model[];
  selectedModels: string[];
  onSelectedModelsChange: (models: string[]) => void;
  onClose: () => void;
}

export default function ModelSelector({
  models,
  selectedModels,
  onSelectedModelsChange,
  onClose,
}: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    const q = searchQuery.toLowerCase();
    return models.filter(
      m => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
    );
  }, [models, searchQuery]);

  const groupedModels = useMemo(() => {
    const groups: Record<string, Model[]> = {};
    filteredModels.forEach(model => {
      if (!groups[model.provider]) groups[model.provider] = [];
      groups[model.provider].push(model);
    });
    return groups;
  }, [filteredModels]);

  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      onSelectedModelsChange(selectedModels.filter(id => id !== modelId));
    } else {
      onSelectedModelsChange([...selectedModels, modelId]);
    }
  };

  const selectAll = () => {
    onSelectedModelsChange(filteredModels.map(m => m.id));
  };

  const selectAllFree = () => {
    const freeModels = models.filter(m => m.id.includes(':free') || (m.pricing.prompt === 0 && m.pricing.completion === 0));
    onSelectedModelsChange(freeModels.map(m => m.id));
  };

  const clearAll = () => {
    onSelectedModelsChange([]);
  };

  const formatPrice = (pricePerToken: number) => {
    const pricePerMillion = pricePerToken * 1_000_000;
    if (pricePerMillion <= 0.001) return 'Free';
    return `$${pricePerMillion.toFixed(2)}/M`;
  };

  return (
    <>
      <div className="model-dropdown-overlay" onClick={onClose} />
      <div className="model-dropdown">
        <div className="model-dropdown-header">
          <div className="model-dropdown-top">
            <span className="model-dropdown-title">Select Models ({selectedModels.length})</span>
            <div className="model-dropdown-actions">
              <button onClick={selectAllFree} style={{ color: 'var(--accent)', fontWeight: 500 }}>All Free</button>
              <span style={{ color: 'var(--border)' }}>·</span>
              <button onClick={selectAll} style={{ color: 'var(--text-secondary)' }}>All</button>
              <span style={{ color: 'var(--border)' }}>·</span>
              <button onClick={clearAll} style={{ color: 'var(--text-muted)' }}>Clear</button>
            </div>
          </div>

          <div className="model-search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search models (e.g. Claude, GPT, Gemini, Llama)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0 4px' }}>×</button>
            )}
          </div>
        </div>

        <div className="model-dropdown-list">
          {Object.keys(groupedModels).length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No models matching "{searchQuery}"
            </div>
          ) : (
            Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div className="model-group" key={provider}>
                <div className="model-group-label">{provider}</div>
                {providerModels.map(model => {
                  const isSelected = selectedModels.includes(model.id);
                  const isFree = model.id.includes(':free') || (model.pricing.prompt === 0 && model.pricing.completion === 0);
                  return (
                    <button
                      key={model.id}
                      className="model-option"
                      onClick={() => toggleModel(model.id)}
                    >
                      <div className={`model-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && (
                          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="model-option-info">
                        <div className="model-option-name">
                          {model.name}
                          {isFree && <span className="free-tag">FREE</span>}
                        </div>
                        <div className="model-option-price">
                          In: {formatPrice(model.pricing.prompt)} · Out: {formatPrice(model.pricing.completion)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
