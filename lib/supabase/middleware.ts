import { NextResponse, type NextRequest } from 'next/server';

// Lightweight middleware — no Supabase network calls.
// Auth is enforced in app/chat/layout.tsx (server component) via getUser().
// This avoids Vercel Edge middleware 504 MIDDLEWARE_INVOCATION_TIMEOUT errors
// which occur when Supabase getSession()/getUser() network calls exceed the
// 1.5s Edge runtime limit on Vercel Hobby plan.
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
