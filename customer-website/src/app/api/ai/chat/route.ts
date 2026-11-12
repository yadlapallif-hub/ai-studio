import { NextRequest, NextResponse } from "next/server";
import { aiChatRequestSchema } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { invokeCreatorAi } from "@/lib/ai-server";
import { buildCreatorAiGuideReply } from "@/lib/creator-ai-guide";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (conversationId) {
    const { data: messages, error } = await supabase
      .from("fcs_ai_messages")
      .select("id, role, content, suggested_actions, provider, model, created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ messages: messages ?? [] });
  }

  const { data: conversations, error } = await supabase
    .from("fcs_ai_conversations")
    .select("id, title, context_page, provider, model, updated_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: conversations ?? [] });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`ai-chat:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMIT", message: "Too many AI chat requests. Please pause briefly." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = aiChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user || !session?.access_token) {
    if (
      parsed.data.mode === "chat" ||
      parsed.data.mode === "certificate_assist" ||
      parsed.data.mode === "support_triage"
    ) {
      const reply = buildCreatorAiGuideReply({
        mode: parsed.data.mode,
        contextPage: parsed.data.contextPage,
        messages: parsed.data.messages,
        contextData: parsed.data.contextData,
      });
      return NextResponse.json({
        reply,
        provider: "creator-ai-guide",
        model: "built-in-guide",
        tokensUsed: 0,
      });
    }

    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Please sign in to chat with Creator AI and save personalized workspace history.",
      },
      { status: 401 }
    );
  }

  const result = await invokeCreatorAi({
    accessToken: session.access_token,
    userId: user.id,
    mode: parsed.data.mode,
    contextPage: parsed.data.contextPage,
    contextDocumentId: parsed.data.contextDocumentId,
    conversationId: parsed.data.conversationId,
    messages: parsed.data.messages,
    contextData: parsed.data.contextData,
    jobDescription: parsed.data.jobDescription,
    attachments: parsed.data.attachments,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        provider: result.provider,
        message: result.message,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    reply: result.reply,
    provider: result.provider,
    model: result.model,
    tokensUsed: result.tokensUsed,
    conversationId: result.conversationId,
    proposedPatch: result.proposedPatch,
    healthReport: result.healthReport,
    generatedPortfolio: result.generatedPortfolio,
    generatedCoverLetter: result.generatedCoverLetter,
  });
}
