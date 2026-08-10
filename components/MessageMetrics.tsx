'use client';

import { useState, useRef, useEffect } from 'react';
import { ResponseLog } from '@/lib/types';

interface MessageMetricsProps {
  logs: ResponseLog[];
}

export default function MessageMetrics({ logs }: MessageMetricsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCost = (cost: number) => {
    if (cost < 0.001) return `$${cost.toFixed(6)}`;
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(4)}`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="metrics-popover-wrapper" ref={ref}>
      <button
        className="message-metrics-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View metrics"
        title="View token usage, cost & latency"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 5v0.5M8 7v4" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && logs.length > 0 && (
        <div className="metrics-popover">
          {logs.map((log, i) => (
            <div key={log.id || i}>
              {logs.length > 1 && (
                <div className="metrics-title">{log.model.split('/').pop()}</div>
              )}
              <div className="metrics-grid">
                <div className="metrics-item">
                  <span className="metrics-label">Input tokens</span>
                  <span className="metrics-value">{log.prompt_tokens.toLocaleString()}</span>
                </div>
                <div className="metrics-item">
                  <span className="metrics-label">Output tokens</span>
                  <span className="metrics-value">{log.completion_tokens.toLocaleString()}</span>
                </div>
                <div className="metrics-divider" />
                <div className="metrics-item">
                  <span className="metrics-label">Cost</span>
                  <span className="metrics-value">{formatCost(log.cost_usd)}</span>
                </div>
                <div className="metrics-item">
                  <span className="metrics-label">Latency</span>
                  <span className="metrics-value">{formatLatency(log.latency_ms)}</span>
                </div>
              </div>
              {i < logs.length - 1 && <div className="metrics-divider" style={{ marginTop: '12px', marginBottom: '12px' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
