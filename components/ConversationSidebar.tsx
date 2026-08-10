'use client';

import { useState } from 'react';
import { Conversation } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationSidebar({ conversations, activeId, onSelect }: ConversationSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from('conversations').delete().eq('id', id);
    if (activeId === id) {
      window.location.href = '/chat';
    } else {
      window.location.reload();
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="sidebar-conversations">
        <div className="sidebar-empty-state">
          <div className="sidebar-empty-icon">💬</div>
          <p>No conversations yet</p>
          <span>Click <strong>+</strong> to start a multi-LLM chat</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-conversations">
      {conversations.map((conv) => {
        const isActive = activeId === conv.id;
        const isDeleting = deletingId === conv.id;

        return (
          <div
            key={conv.id}
            className={`conversation-item ${isActive ? 'active' : ''} ${isDeleting ? 'deleting' : ''}`}
            onClick={() => onSelect(conv.id)}
            title={conv.title}
          >
            <div className="conv-item-content">
              <svg className="conv-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="conv-title">{conv.title}</span>
            </div>

            <button
              className="conv-delete-btn"
              onClick={(e) => handleDelete(e, conv.id)}
              title="Delete conversation"
              aria-label="Delete conversation"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
