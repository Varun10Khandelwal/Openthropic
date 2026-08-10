'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConversationSidebar from './ConversationSidebar';
import UserMenu from './UserMenu';
import { Conversation } from '@/lib/types';

interface ChatLayoutClientProps {
  conversations: Conversation[];
  user: { email: string; avatar?: string };
  children: React.ReactNode;
}

export default function ChatLayoutClient({ conversations, user, children }: ChatLayoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentConvId = searchParams.get('id');

  const handleNewChat = () => {
    router.push('/chat');
    setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/chat?id=${id}`);
    setSidebarOpen(false);
  };

  return (
    <div className="chat-layout">
      {/* Mobile sidebar toggle */}
      <button
        className="mobile-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2.25 4.5h13.5M2.25 9h13.5M2.25 13.5h13.5" strokeLinecap="round" />
        </svg>
      </button>

      <aside className={`chat-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">Openthropic</h2>
          <button className="new-chat-btn" onClick={handleNewChat} aria-label="New chat">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 3.75v10.5M3.75 9h10.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ConversationSidebar
          conversations={conversations}
          activeId={currentConvId}
          onSelect={handleSelectConversation}
        />
        <div className="sidebar-footer">
          <UserMenu user={user} />
        </div>
      </aside>

      <main className="chat-main">
        {children}
      </main>
    </div>
  );
}
