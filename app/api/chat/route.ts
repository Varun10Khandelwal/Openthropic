import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { streamChatCompletion, fetchModels, calculateCost } from '@/lib/openrouter';
import { ChatRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('API chat auth error:', authError);
    return NextResponse.json({ error: 'Unauthorized: Please log in again.' }, { status: 401 });
  }

  // 2. Parse body
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { message, models: selectedModels } = body;
  let { conversationId } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
  }

  if (!selectedModels?.length) {
    return NextResponse.json({ error: 'Please select at least one model.' }, { status: 400 });
  }

  // 3. Create or verify conversation
  if (!conversationId) {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: message.slice(0, 100) })
      .select()
      .single();
    
    if (convError || !conv) {
      console.error('Failed to create conversation in Supabase:', convError);
      return NextResponse.json({ 
        error: `Database error creating conversation: ${convError?.message || 'Check your Supabase schema and RLS policies'}` 
      }, { status: 500 });
    }
    conversationId = conv.id;
  }

  // 4. Save user message
  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    });
  
  if (msgError) {
    console.error('Failed to save user message in Supabase:', msgError);
    return NextResponse.json({ 
      error: `Database error saving message: ${msgError.message}` 
    }, { status: 500 });
  }

  // 5. Fetch conversation history for context
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  const conversationMessages = (history || []).map(m => ({
    role: m.role,
    content: m.content,
  }));

  // 6. Fetch model pricing
  let modelPricing: Record<string, { prompt: number; completion: number }> = {};
  try {
    const allModels = await fetchModels();
    allModels.forEach(m => {
      modelPricing[m.id] = m.pricing;
    });
  } catch (e) {
    console.error('Failed to fetch model pricing:', e);
  }

  // 7. Stream SSE responses
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send conversation_id first
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'init', conversation_id: conversationId })}\n\n`
      ));

      // Process each model in parallel
      const promises = selectedModels.map(async (modelId) => {
        const startTime = Date.now();
        let fullContent = '';
        let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        try {
          const response = await streamChatCompletion(modelId, conversationMessages);
          
          if (!response.ok) {
            let errorDetail = '';
            try {
              const errJson = await response.json();
              errorDetail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
            } catch {
              errorDetail = await response.text();
            }

            const isCreditError = response.status === 402 || errorDetail.toLowerCase().includes('credit') || errorDetail.toLowerCase().includes('balance');
            const userMsg = isCreditError
              ? `Requires OpenRouter credits (${response.status}: ${errorDetail || 'Insufficient balance'})`
              : `Provider error (${response.status}: ${errorDetail})`;

            // Save error message to DB so it persists visibly
            const { data: savedErrMsg } = await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: `⚠️ ${userMsg}`,
                model: modelId,
              })
              .select('id')
              .single();

            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'chunk',
                model: modelId,
                content: `⚠️ ${userMsg}`,
                done: false,
              })}\n\n`
            ));

            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                model: modelId,
                content: '',
                done: true,
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                latency_ms: Date.now() - startTime,
                cost_usd: 0,
                message_id: savedErrMsg?.id,
              })}\n\n`
            ));
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
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.content) {
                  fullContent += delta.content;
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'chunk',
                      model: modelId,
                      content: delta.content,
                      done: false,
                    })}\n\n`
                  ));
                }
                if (parsed.usage) {
                  usage = {
                    prompt_tokens: parsed.usage.prompt_tokens || 0,
                    completion_tokens: parsed.usage.completion_tokens || 0,
                    total_tokens: parsed.usage.total_tokens || 0,
                  };
                }
              } catch {
                // Skip malformed JSON chunk
              }
            }
          }

          const latencyMs = Date.now() - startTime;
          const pricing = modelPricing[modelId] || { prompt: 0, completion: 0 };
          const costUsd = calculateCost(usage.prompt_tokens, usage.completion_tokens, pricing);

          // Save assistant message to DB
          const { data: savedMsg } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullContent || '(No response generated)',
              model: modelId,
            })
            .select('id')
            .single();

          // Save response log
          if (savedMsg) {
            await supabase.from('response_logs').insert({
              message_id: savedMsg.id,
              model: modelId,
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              total_tokens: usage.total_tokens,
              cost_usd: costUsd,
              latency_ms: latencyMs,
            });
          }

          // Send done event for this model
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              model: modelId,
              content: '',
              done: true,
              usage,
              latency_ms: latencyMs,
              cost_usd: costUsd,
              message_id: savedMsg?.id,
            })}\n\n`
          ));

        } catch (error) {
          console.error(`Error streaming model ${modelId}:`, error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              model: modelId,
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            })}\n\n`
          ));
        }
      });

      await Promise.all(promises);
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
