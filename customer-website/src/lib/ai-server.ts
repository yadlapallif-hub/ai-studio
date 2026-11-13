import {
  analyzeResumeHealthCheck,
  buildDeterministicResumePatch,
  type ResumeAiPatchProposal,
  type ResumeData,
  type ResumeHealthCheckReport,
} from "@francis/shared";
import { createServiceSupabase } from "@/lib/supabase/server";
import { buildCreatorAiGuideReply } from "@/lib/creator-ai-guide";
import { createWorkspaceNotification } from "@/lib/notifications";

export interface AiAttachmentInput {
  name: string;
  mimeType: string;
  textContent?: string;
  imageDataUrl?: string;
}

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
  attachments?: AiAttachmentInput[];
}

export interface AiInvocationResult {
  ok: boolean;
  status: number;
  reply?: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  conversationId?: string;
  proposedPatch?: ResumeAiPatchProposal;
  healthReport?: ResumeHealthCheckReport;
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

function resolveProviderConfig(
  provider: string,
  configuredModel?: string,
  override?: { baseUrl?: string | null; apiKey?: string | null }
) {
  const p = provider.toLowerCase();
  const customKey = override?.apiKey?.trim() || "";
  const customBase = override?.baseUrl?.trim()?.replace(/\/+$/, "") || "";

  if (p === "openai") {
    const apiKey = customKey || (process.env.OPENAI_API_KEY ?? "");
    const baseUrl = customBase || (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    return {
      endpoint: apiKey ? `${baseUrl}/chat/completions` : "",
      apiKey,
      model: configuredModel || process.env.AI_MODEL || "gpt-4o-mini",
      isOllamaNative: false,
    };
  }
  if (p === "gemini") {
    const apiKey = customKey || (process.env.GEMINI_API_KEY ?? "");
    return {
      endpoint: apiKey ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "",
      apiKey,
      model: configuredModel || "gemini-2.5-flash",
      isOllamaNative: false,
    };
  }
  if (p === "groq") {
    const apiKey = customKey || (process.env.GROQ_API_KEY ?? "");
    return {
      endpoint: apiKey ? "https://api.groq.com/openai/v1/chat/completions" : "",
      apiKey,
      model: configuredModel || "llama-3.3-70b-versatile",
      isOllamaNative: false,
    };
  }
  if (p === "openrouter") {
    const apiKey = customKey || (process.env.OPENROUTER_API_KEY ?? "");
    return {
      endpoint: apiKey ? "https://openrouter.ai/api/v1/chat/completions" : "",
      apiKey,
      model: configuredModel || "meta-llama/llama-3.3-70b-instruct:free",
      isOllamaNative: false,
    };
  }
  if (p === "ollama") {
    const apiKey = customKey || (process.env.OLLAMA_API_KEY ?? "");
    const base =
      customBase ||
      (process.env.OLLAMA_BASE_URL ?? (apiKey ? "https://ollama.com/api" : "")).replace(/\/+$/, "");
    return {
      endpoint: base ? (base.endsWith("/chat") ? base : `${base}/chat`) : "",
      apiKey,
      model: configuredModel || process.env.OLLAMA_MODEL || "llama3.2",
      isOllamaNative: true,
    };
  }
  if (p === "custom") {
    const apiKey = customKey || (process.env.CUSTOM_AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "");
    const baseUrl =
      customBase || (process.env.CUSTOM_AI_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "").replace(/\/+$/, "");
    return {
      endpoint: baseUrl ? `${baseUrl}/chat/completions` : "",
      apiKey,
      model: configuredModel || process.env.AI_MODEL || "default",
      isOllamaNative: false,
    };
  }

  return { endpoint: "", apiKey: "", model: configuredModel || "", isOllamaNative: false };
}

function buildStructuredContextExtras(input: AiInvocationInput) {
  const ctxResume = input.contextData?.resume as ResumeData | undefined;
  const lastPrompt = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";

  let proposedPatch: ResumeAiPatchProposal | undefined;
  let healthReport: ResumeHealthCheckReport | undefined;

  if (ctxResume && (input.mode === "resume_health_check" || input.mode === "resume_action_patch")) {
    healthReport = analyzeResumeHealthCheck(ctxResume, undefined, input.jobDescription);
    proposedPatch = buildDeterministicResumePatch(ctxResume, lastPrompt || input.jobDescription);
  } else if (
    ctxResume &&
    input.mode === "chat" &&
    /improve my resume|tailor my resume|optimize my resume|rewrite my resume|internship/i.test(
      lastPrompt
    )
  ) {
    proposedPatch = buildDeterministicResumePatch(ctxResume, lastPrompt);
  }

  return { proposedPatch, healthReport };
}

export async function invokeCreatorAi(input: AiInvocationInput): Promise<AiInvocationResult> {
  const adminDb = createServiceSupabase();

  const [{ data: settingsRow }, { data: userAiRow }] = await Promise.all([
    adminDb.from("fcs_platform_settings").select("value").eq("key", "ai_config").maybeSingle(),
    adminDb
      .from("fcs_user_ai_configs")
      .select("enabled, provider, model, base_url, encrypted_api_key")
      .eq("user_id", input.userId)
      .maybeSingle(),
  ]);

  const aiConfig = (settingsRow?.value ?? {}) as AiConfigShape;

  if (aiConfig.enabled === false && !userAiRow?.enabled) {
    return {
      ok: false,
      status: 503,
      error: "AI_DISABLED",
      message: "Creator AI Assistant is currently disabled by an administrator.",
    };
  }

  const usingUserOverride = Boolean(userAiRow?.enabled);
  const provider = (
    (usingUserOverride ? userAiRow?.provider : aiConfig.provider) ||
    process.env.AI_PROVIDER ||
    "ollama"
  ).toLowerCase();

  const localCfg = usingUserOverride
    ? resolveProviderConfig(provider, userAiRow?.model, {
        baseUrl: userAiRow?.base_url,
        apiKey: userAiRow?.encrypted_api_key,
      })
    : resolveProviderConfig(provider, aiConfig.model);

  const extras = buildStructuredContextExtras(input);
  let reply = "";
  let usedProvider = provider;
  let usedModel = localCfg.model;
  let tokensUsed = 0;
  let fallbackReason: string | null = null;

  if (localCfg.endpoint) {
    const hourlyLimit = Number(aiConfig.hourly_limit_per_user ?? 60);
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);
    const { data: rlRow } = await adminDb
      .from("fcs_rate_limits")
      .select("id, request_count")
      .eq("user_id", input.userId)
      .eq("endpoint", "fcs_ai")
      .eq("window_start", windowStart.toISOString())
      .maybeSingle();

    if ((rlRow?.request_count ?? 0) >= hourlyLimit && !usingUserOverride) {
      return {
        ok: false,
        status: 429,
        error: "RATE_LIMIT_EXCEEDED",
        message: `Hourly AI limit (${hourlyLimit} requests/hour) reached. You can configure your own local Ollama or API provider in Settings.`,
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

    const docAttachmentsText = (input.attachments ?? [])
      .filter((a) => a.textContent && a.textContent.trim().length > 0)
      .map((a) => `Attached File "${a.name}" (${a.mimeType}):\n${a.textContent!.slice(0, 8000)}`)
      .join("\n\n");

    const systemPrompt = [
      aiConfig.system_instructions ||
        "You are Creator AI inside FRANCIS CREATOR STUDIO (Created & Developed by FRANCIS). Be factual, practical, and helpful.",
      "Platform Modules: AI Resume Studio (/resume-builder, 100 templates, 14 sections, DOCX + PDF + PNG exports, AI Resume Health Check), Certificate Studio & Bulk Generator (/certificate-builder, /bulk-generator, 124 templates, Stamp/Signature studio, QR Verification /verify), Document Vault (/vault), Global Search (Ctrl+K), Tutorials (/tutorials), Support (/support).",
      `Active route context: ${input.contextPage}. Task mode: ${input.mode}.`,
      faqKnowledge ? `Platform FAQ Knowledge:\n${faqKnowledge}` : "",
      docAttachmentsText ? `Uploaded Document Attachments:\n${docAttachmentsText}` : "",
      "Never fabricate user employment, degrees, or credentials. Never guarantee ATS selection. Only suggest realistic, user-approved improvements.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const imageAttachments = (input.attachments ?? []).filter(
      (a) => a.imageDataUrl && a.imageDataUrl.startsWith("data:image/")
    );

    const trimmedMessages = input.messages.slice(-12);
    const formattedMessages = trimmedMessages.map((m, idx) => {
      const isLastUser = idx === trimmedMessages.length - 1 && m.role === "user";
      if (isLastUser && imageAttachments.length > 0 && !localCfg.isOllamaNative) {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content },
            ...imageAttachments.map((img) => ({
              type: "image_url",
              image_url: { url: img.imageDataUrl! },
            })),
          ],
        };
      }
      return m;
    });

    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...(input.contextData
        ? [
            {
              role: "system" as const,
              content: `Workspace context JSON: ${JSON.stringify(input.contextData).slice(0, 7000)}`,
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
      ...formattedMessages,
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
          Number(
            json?.usage?.total_tokens ??
              (json?.prompt_eval_count ?? 0) + (json?.eval_count ?? 0)
          ) || 0;
      }
    } catch {
      fallbackReason = "Upstream network unreachable";
    }
  } else {
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

  // Deterministic smart synthesis fallback if external LLM keys are unconfigured/unreachable
  if (!reply) {
    if (extras.healthReport) {
      const r = extras.healthReport;
      reply = [
        `AI Resume Health Check — Overall Score: ${r.overallScore}/100 (${r.readinessLabel})`,
        "",
        ...r.axes.map(
          (ax) => `• ${ax.label}: ${ax.score}/100 — ${ax.finding} Next: ${ax.action}`
        ),
        "",
        extras.proposedPatch ? `Recommended Update Ready for Review:\n${extras.proposedPatch.rationale}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      usedProvider = "creator-ai-engine";
      usedModel = "resume-health-analyzer";
    } else {
      const attachmentNote =
        (input.attachments?.length ?? 0) > 0
          ? `I received your attachment(s): ${input.attachments!.map((a) => a.name).join(", ")}. `
          : "";
      const extractedPreview = (input.attachments ?? [])
        .find((a) => a.textContent)
        ?.textContent?.slice(0, 420);
      reply =
        attachmentNote +
        buildCreatorAiGuideReply({
          mode: input.mode,
          contextPage: input.contextPage,
          messages: input.messages,
          contextData: input.contextData,
        }) +
        (extractedPreview
          ? `\n\nDocument Excerpt Analyzed:\n"${extractedPreview.trim()}${extractedPreview.length >= 420 ? "..." : ""}"`
          : "");
      usedProvider = "creator-ai-guide";
      usedModel = fallbackReason ? "built-in-guide" : "creator-ai-guide";
    }
  }

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
        suggested_actions: extras.proposedPatch ?? null,
        tokens_used: tokensUsed,
        provider: usedProvider,
        model: usedModel,
      });
      await adminDb.from("fcs_ai_messages").insert(rowsToInsert);
    }
  }

  if (input.mode !== "chat" && input.mode !== "support_triage") {
    await createWorkspaceNotification({
      userId: input.userId,
      prefKey: "ai_task_completed",
      title: "Creator AI Task Complete",
      message: `Finished "${input.mode.replace(/_/g, " ")}" in ${input.contextPage}.`,
      link: input.contextDocumentId ? `/resume-builder/${input.contextDocumentId}` : "/assistant",
    });
  }

  return {
    ok: true,
    status: 200,
    reply,
    provider: usedProvider,
    model: usedModel,
    tokensUsed,
    conversationId,
    proposedPatch: extras.proposedPatch,
    healthReport: extras.healthReport,
  };
}

export const invokeFrancisAi = invokeCreatorAi;
