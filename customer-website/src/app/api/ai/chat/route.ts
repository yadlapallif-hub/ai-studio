import { NextRequest, NextResponse } from "next/server";
import { aiChatRequestSchema } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { invokeFrancisAi } from "@/lib/ai-server";

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
      .select("id, role, content, provider, model, created_at")
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
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user || !session?.access_token) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Please sign in to chat with FRANCIS AI Assistant and save conversation history.",
      },
      { status: 401 }
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

  const result = await invokeFrancisAi({
    accessToken: session.access_token,
    userId: user.id,
    mode: parsed.data.mode,
    contextPage: parsed.data.contextPage,
    contextDocumentId: parsed.data.contextDocumentId,
    conversationId: parsed.data.conversationId,
    messages: parsed.data.messages,
    contextData: parsed.data.contextData,
    jobDescription: parsed.data.jobDescription,
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
  });
}
