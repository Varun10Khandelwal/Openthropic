import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChatLayoutClient from '@/components/ChatLayoutClient';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <ChatLayoutClient
      conversations={conversations || []}
      user={{ email: user.email || '', avatar: user.user_metadata?.avatar_url }}
    >
      {children}
    </ChatLayoutClient>
  );
}
