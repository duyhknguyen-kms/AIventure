/**
 * POST /api/chat
 *
 * Proxies chat messages to the Groq API (OpenAI-compatible, free tier).
 * Streams the response as Server-Sent Events (text/event-stream).
 *
 * Body: { messages: OpenAI-format message array, context?: string }
 * The `context` field is prepended to the system prompt so the bot knows
 * about the job the user is looking at.
 *
 * Required env variable: GROQ_API_KEY
 * Get a free key at https://console.groq.com
 */

import { NextRequest, NextResponse } from "next/server";

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // available on the free tier
const MAX_TOKENS = 1024;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  context?: string;
}

const BASE_SYSTEM = `You are a friendly and knowledgeable career advisor assistant for AIventure, a remote job search platform.
You help users find their ideal remote jobs, review job descriptions, write cover letters, identify skill gaps, and prepare for interviews.
Keep answers concise and practical. Format lists with bullet points.
If the user asks about something unrelated to careers or job searching, politely redirect to career topics.`;

function buildSystemPrompt(context?: string): string {
  if (!context) return BASE_SYSTEM;
  return `${BASE_SYSTEM}\n\nCurrent job the user is viewing:\n${context}`;
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No GROQ_API_KEY configured. Add a free key from https://console.groq.com to web/.env.local.",
      },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, context } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required." }, { status: 400 });
  }

  // Strip any existing system messages the client sent; use ours exclusively.
  const userMessages = messages.filter((m) => m.role !== "system");

  const payload = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages: [
      { role: "system" as const, content: buildSystemPrompt(context) },
      ...userMessages.slice(-20), // keep last 20 for token budget
    ],
  };

  let upstream: Response;
  try {
    upstream = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[chat] Groq request failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not reach the AI service." }, { status: 502 });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("[chat] Groq error", upstream.status, text.slice(0, 200));
    const msg =
      upstream.status === 401
        ? "Invalid API key — check your GROQ_API_KEY."
        : upstream.status === 404
        ? "AI model not found. Update the MODEL constant in api/chat/route.ts."
        : upstream.status === 429
        ? "Rate limit reached — try again in a moment."
        : `AI service error (${upstream.status}).`;
    return NextResponse.json({ error: msg }, { status: upstream.status });
  }

  // Pipe the SSE stream straight to the browser.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
