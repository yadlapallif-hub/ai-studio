import { createServiceSupabase } from "@/lib/supabase/server";
import { buildCreatorAiGuideReply } from "@/lib/creator-ai-guide";

export interface AiInvocationInput {
  accessToken: string;
  userId: string;
  mode: string;
  contextPage: string;
  contextDocumentId?: string;
  conversationId?: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  contextData?: Record<string, unknown>;
  jobDescription?: string;
}

export interface AiInvocationResult {
  ok: boolean;
  status: number;
  reply?: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  conversationId?: string;
  error?: string;
  message?: string;
}

interface AiConfigShape {
  enabled?: boolean;
  provider?: string;
  model?: string;
  system_instructions?: string;
  hourly_limit_per_user?: number;
  privacy_retain_conversations?: boolean;
}

function getLocalProviderConfig(provider: string, configuredModel?: string) {
  const p = provider.toLowerCase();
  if (p === "openai") {
    const apiKey = process.env.OPENAI_API_KEY ?? "";
    const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    return {
      endpoint: apiKey ? `${baseUrl}/chat/completions` : "",
      apiKey,
      model: configuredModel || process.env.AI_MODEL || "gpt-4o-mini",
      isOllamaNative: false,
    };
  }
  if (p === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    return {
      endpoint: apiKey ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "",
      apiKey,
      model: configuredModel || "gemini-2.5-flash",
      isOllamaNative: false,
    };
  }
  if (p === "groq") {
    const apiKey = process.env.GROQ_API_KEY ?? "";
    return {
      endpoint: apiKey ? "https://api.groq.com/openai/v1/chat/completions" : "",
      apiKey,
      model: configuredModel || "llama-3.3-70b-versatile",
      isOllamaNative: false,
    };
  }
  if (p === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY ?? "";
    return {
      endpoint: apiKey ? "https://openrouter.ai/api/v1/chat/completions" : "",
      apiKey,
      model: configuredModel || "meta-llama/llama-3.3-70b-instruct:free",
      isOllamaNative: false,
    };
  }
  if (p === "ollama") {
    const apiKey = process.env.OLLAMA_API_KEY ?? "";
    const base = (process.env.OLLAMA_BASE_URL ?? (apiKey ? "https://ollama.com/api" : "")).replace(
      /\/+$/,
      ""
    );
    return {
      endpoint: base ? (base.endsWith("/chat") ? base : `${base}/chat`) : "",
      apiKey,
      model: process.env.OLLAMA_MODEL || configuredModel || "llama3.2",
      isOllamaNative: true,
    };
  }
  if (p === "custom") {
    const apiKey = process.env.CUSTOM_AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
    const baseUrl = (process.env.CUSTOM_AI_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "").replace(
      /\/+$/,
      ""
    );
    return {
      endpoint: baseUrl && apiKey ? `${baseUrl}/chat/completions` : "",
      apiKey,
      model: configuredModel || process.env.AI_MODEL || "default",
      isOllamaNative: false,
    };
  }

  return { endpoint: "", apiKey: "", model: configuredModel || "", isOllamaNative: false };
}

export async function invokeCreatorAi(input: AiInvocationInput): Promise<AiInvocationResult> {
  const adminDb = createServiceSupabase();

  const { data: settingsRow } = await adminDb
    .from("fcs_platform_settings")
    .select("value")
    .eq("key", "ai_config")
    .maybeSingle();

  const aiConfig = (settingsRow?.value ?? {}) as AiConfigShape;

  if (aiConfig.enabled === false) {
    return {
      ok: false,
      status: 503,
      error: "AI_DISABLED",
      message: "Creator AI Assistant is currently disabled by an administrator.",
    };
  }

  const provider = (aiConfig.provider || process.env.AI_PROVIDER || "ollama").toLowerCase();
  const localCfg = getLocalProviderConfig(provider, aiConfig.model);

  let reply = "";
  let usedProvider = provider;
  let usedModel = localCfg.model;
  let tokensUsed = 0;
  let fallbackReason: string | null = null;

  if (localCfg.endpoint) {
    // Rate limit locally before calling upstream directly
    const hourlyLimit = Number(aiConfig.hourly_limit_per_user ?? 40);
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);
    const { data: rlRow } = await adminDb
      .from("fcs_rate_limits")
      .select("id, request_count")
      .eq("user_id", input.userId)
      .eq("endpoint", "fcs_ai")
      .eq("window_start", windowStart.toISOString())
      .maybeSingle();

    if ((rlRow?.request_count ?? 0) >= hourlyLimit) {
      return {
        ok: false,
        status: 429,
        error: "RATE_LIMIT_EXCEEDED",
        message: `Hourly AI limit (${hourlyLimit} requests/hour) reached. Please try again later.`,
      };
    }

    if (rlRow?.id) {
      await adminDb
        .from("fcs_rate_limits")
        .update({ request_count: rlRow.request_count + 1 })
        .eq("id", rlRow.id);
    } else {
      await adminDb.from("fcs_rate_limits").insert({
        user_id: input.userId,
        endpoint: "fcs_ai",
        window_start: windowStart.toISOString(),
        request_count: 1,
      });
    }

    const { data: faqs } = await adminDb
      .from("fcs_faqs")
      .select("question, answer")
      .eq("is_published", true)
      .eq("include_in_ai_knowledge", true)
      .order("sort_order", { ascending: true })
      .limit(15);

    const faqKnowledge = (faqs ?? [])
      .map((f: { question: string; answer: string }) => `Q: ${f.question}\nA: ${f.answer}`)
      .join("\n\n");

    const systemPrompt = [
      aiConfig.system_instructions ||
        "You are Creator AI inside CREATOR STUDIO (Built by Francis). Be factual, practical, and helpful.",
      "Platform Overview: Creator Studio is a 100% free, open-source (MIT) website Built by Francis offering (1) AI Resume Studio (/resume-builder, 100 templates, 14 sections, ATS scoring, free A4 PDF/PNG export), (2) Authorized Certificate Studio (/certificate-builder, 100 templates exclusively for Admin-approved Authorized Organizations, Stamp Studio /stamps with add/delete controls, and one-click 'Publish Verified Certificate' turning drafts into Verified records on /verify), (3) Public Certificate Verification (/verify), (4) Document Vault (/vault), and (5) Just Email magic-link or password login (/auth/login).",
      "Also help users who ask how to build a website (planning pages, Next.js + React + Tailwind frontend, Supabase/PostgreSQL auth & RLS database, API routes, testing, and Vercel deployment) or how to build/publish a verified certificate.",
      `Active route context: ${input.contextPage}. Task mode: ${input.mode}.`,
      faqKnowledge ? `Platform FAQ Knowledge:\n${faqKnowledge}` : "",
      "Never fabricate user employment, degrees, or credentials. Never guarantee ATS selection. If the user faces an unresolved technical/account issue, advise opening live support or a ticket at /support.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...(input.contextData
        ? [
            {
              role: "system" as const,
              content: `Workspace context JSON: ${JSON.stringify(input.contextData).slice(0, 6000)}`,
            },
          ]
        : []),
      ...(input.jobDescription
        ? [
            {
              role: "system" as const,
              content: `Target Job Description:\n${input.jobDescription.slice(0, 4000)}`,
            },
          ]
        : []),
      ...input.messages.slice(-12),
    ];

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (localCfg.apiKey) headers["Authorization"] = `Bearer ${localCfg.apiKey}`;
      const bodyPayload = localCfg.isOllamaNative
        ? { model: localCfg.model, messages: fullMessages, stream: false }
        : { model: localCfg.model, messages: fullMessages, temperature: 0.45 };

      const upstream = await fetch(localCfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!upstream.ok) {
        fallbackReason = `Upstream ${provider} HTTP ${upstream.status}`;
      } else {
        const json = await upstream.json();
        reply = json?.choices?.[0]?.message?.content ?? json?.message?.content ?? "";
        tokensUsed =
          Number(json?.usage?.total_tokens ?? ((json?.prompt_eval_count ?? 0) + (json?.eval_count ?? 0))) || 0;
      }
    } catch {
      fallbackReason = "Upstream network unreachable";
    }
  } else {
    // Delegate to Supabase Edge Function fcs-ai-assistant (which reads Supabase Edge Secrets)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      fallbackReason = "Edge function env not configured";
    } else {
      try {
        const fnResp = await fetch(`${supabaseUrl}/functions/v1/fcs-ai-assistant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${input.accessToken}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            mode: input.mode,
            contextPage: input.contextPage,
            contextData: input.contextData,
            jobDescription: input.jobDescription,
            messages: input.messages,
          }),
        });

        const fnData = (await fnResp.json()) as {
          reply?: string;
          provider?: string;
          model?: string;
          tokensUsed?: number;
          error?: string;
          message?: string;
        };

        if (fnResp.status === 429) {
          return {
            ok: false,
            status: 429,
            provider: fnData.provider || provider,
            error: fnData.error || "RATE_LIMIT_EXCEEDED",
            message: fnData.message || "Hourly AI limit reached.",
          };
        }

        if (!fnResp.ok || !fnData.reply) {
          fallbackReason = fnData.error || "Provider unconfigured";
        } else {
          reply = fnData.reply;
          usedModel = fnData.model || usedModel;
          tokensUsed = fnData.tokensUsed || 0;
        }
      } catch {
        fallbackReason = "Edge function unavailable";
      }
    }
  }

  // Fallback gracefully to built-in Creator AI guide whenever external LLM keys are missing/unavailable
  if (!reply) {
    reply = buildCreatorAiGuideReply({
      mode: input.mode,
      contextPage: input.contextPage,
      messages: input.messages,
      contextData: input.contextData,
    });
    usedProvider = "creator-ai-guide";
    usedModel = fallbackReason ? "built-in-guide" : "creator-ai-guide";
  }

  // Persist conversation history if retention enabled
  let conversationId = input.conversationId;
  if (aiConfig.privacy_retain_conversations !== false) {
    const lastUserMessage = [...input.messages].reverse().find((m) => m.role === "user");
    if (!conversationId) {
      const { data: conv } = await adminDb
        .from("fcs_ai_conversations")
        .insert({
          user_id: input.userId,
          title: (lastUserMessage?.content || "AI Conversation").slice(0, 70),
          context_page: input.contextPage,
          context_document_id: input.contextDocumentId ?? null,
          provider: usedProvider,
          model: usedModel,
        })
        .select("id")
        .single();
      conversationId = conv?.id;
    } else {
      await adminDb
        .from("fcs_ai_conversations")
        .update({ updated_at: new Date().toISOString(), provider: usedProvider, model: usedModel })
        .eq("id", conversationId)
        .eq("user_id", input.userId);
    }

    if (conversationId) {
      const rowsToInsert = [];
      if (lastUserMessage) {
        rowsToInsert.push({
          conversation_id: conversationId,
          user_id: input.userId,
          role: "user",
          content: lastUserMessage.content,
          provider: usedProvider,
          model: usedModel,
        });
      }
      rowsToInsert.push({
        conversation_id: conversationId,
        user_id: input.userId,
        role: "assistant",
        content: reply,
        tokens_used: tokensUsed,
        provider: usedProvider,
        model: usedModel,
      });
      await adminDb.from("fcs_ai_messages").insert(rowsToInsert);
    }
  }

  return {
    ok: true,
    status: 200,
    reply,
    provider: usedProvider,
    model: usedModel,
    tokensUsed,
    conversationId,
  };
}

export const invokeFrancisAi = invokeCreatorAi;
