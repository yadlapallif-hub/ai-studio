const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AiRequestBody {
  mode?:
    | "chat"
    | "resume_summary"
    | "resume_improve"
    | "resume_grammar"
    | "resume_skills"
    | "resume_objective"
    | "resume_ats_optimize"
    | "resume_jd_match"
    | "certificate_assist"
    | "recommendations";
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  contextPage?: string;
  contextData?: Record<string, unknown>;
  conversationId?: string;
  jobDescription?: string;
}

function serviceHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": key,
  };
  if (key.startsWith("eyJ")) {
    headers["Authorization"] = `Bearer ${key}`;
  }
  return headers;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return Response.json(
      { error: "BACKEND_MISCONFIGURED", message: "Supabase environment variables are missing in Edge Function." },
      { status: 500, headers: corsHeaders }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "UNAUTHORIZED", message: "Sign in required to use Creator AI." }, { status: 401, headers: corsHeaders });
  }

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      "apikey": supabaseAnonKey,
      "Authorization": authHeader,
    },
  });
  if (!userResp.ok) {
    return Response.json({ error: "UNAUTHORIZED", message: "Invalid or expired session." }, { status: 401, headers: corsHeaders });
  }
  const authUser = (await userResp.json().catch(() => null)) as { id?: string } | null;
  const userId = authUser?.id;
  if (!userId) {
    return Response.json({ error: "UNAUTHORIZED", message: "Invalid or expired session." }, { status: 401, headers: corsHeaders });
  }

  const adminHdrs = serviceHeaders(supabaseServiceKey);

  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/fcs_profiles?select=status&id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: adminHdrs }
  );
  const profiles = (profileResp.ok ? await profileResp.json().catch(() => []) : []) as Array<{ status?: string }>;
  if (profiles[0]?.status === "suspended") {
    return Response.json({ error: "ACCOUNT_SUSPENDED", message: "Your account is currently suspended." }, { status: 403, headers: corsHeaders });
  }

  const settingsResp = await fetch(
    `${supabaseUrl}/rest/v1/fcs_platform_settings?select=value&key=eq.ai_config&limit=1`,
    { headers: adminHdrs }
  );
  const settingsRows = (settingsResp.ok ? await settingsResp.json().catch(() => []) : []) as Array<{ value?: unknown }>;

  const aiConfig = (settingsRows[0]?.value ?? {}) as {
    enabled?: boolean;
    provider?: string;
    model?: string;
    system_instructions?: string;
    hourly_limit_per_user?: number;
  };

  if (aiConfig.enabled === false) {
    return Response.json(
      { error: "AI_DISABLED", message: "Creator AI Assistant is currently disabled by an administrator." },
      { status: 503, headers: corsHeaders }
    );
  }

  const hourlyLimit = Number(aiConfig.hourly_limit_per_user ?? 40);
  const rateResp = await fetch(`${supabaseUrl}/rest/v1/rpc/fcs_consume_rate_limit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseAnonKey,
      "Authorization": authHeader,
    },
    body: JSON.stringify({
      p_endpoint: "fcs_ai",
      p_limit: hourlyLimit,
    }),
  });
  const allowed = rateResp.ok ? await rateResp.json().catch(() => true) : true;

  if (allowed === false) {
    return Response.json(
      { error: "RATE_LIMIT_EXCEEDED", message: `Hourly AI limit (${hourlyLimit} requests/hour) reached. Please try again later.` },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: AiRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON", message: "Invalid JSON request payload." }, { status: 400, headers: corsHeaders });
  }

  const faqsResp = await fetch(
    `${supabaseUrl}/rest/v1/fcs_faqs?select=question,answer,category&is_published=eq.true&include_in_ai_knowledge=eq.true&order=sort_order.asc&limit=15`,
    { headers: adminHdrs }
  );
  const faqs = (faqsResp.ok ? await faqsResp.json().catch(() => []) : []) as Array<{ question: string; answer: string }>;

  const faqKnowledge = faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const systemPrompt = [
    aiConfig.system_instructions ||
      "You are Creator AI inside CREATOR STUDIO (Built by Francis). Be truthful, practical, and concise.",
    "Website Information: Creator Studio is a 100% free, open-source (MIT) document engineering platform Built by Francis with AI Resume Studio (/resume-builder, 100 templates, 14 sections, ATS score, free A4 PDF/PNG export), Authorized Certificate Studio (/certificate-builder, 124 templates exclusively for Admin-approved Authorized Organizations, Stamp Studio /stamps, and one-click Publish Verified Certificate), Public Verification (/verify), Document Vault (/vault), and Just Email login (/auth/login). Also explain clearly how to build a website or build and verify a certificate when asked.",
    `Current surface/context page: ${body.contextPage ?? "general"}.`,
    `Mode: ${body.mode ?? "chat"}.`,
    faqKnowledge ? `Platform FAQ Knowledge:\n${faqKnowledge}` : "",
    "Important rules: Never invent user achievements, degrees, or employment. Never claim an ATS score guarantees job selection. If the user reports an unresolved technical or account issue, clearly advise opening a support ticket or live support chat in /support.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(body.contextData
      ? [{ role: "system" as const, content: `Current workspace JSON context (do not leak raw keys): ${JSON.stringify(body.contextData).slice(0, 6000)}` }]
      : []),
    ...(body.jobDescription
      ? [{ role: "system" as const, content: `Target job description:\n${body.jobDescription.slice(0, 4000)}` }]
      : []),
    ...(body.messages ?? []).slice(-12),
  ];

  const provider = (aiConfig.provider || "ollama").toLowerCase();
  const configuredModel = aiConfig.model || "";

  let endpoint = "";
  let apiKey = "";
  let model = configuredModel;
  let isOllamaNative = false;

  if (provider === "openai") {
    apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const baseUrl = (Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    endpoint = `${baseUrl}/chat/completions`;
    model = configuredModel || Deno.env.get("AI_MODEL") || "gpt-4o-mini";
  } else if (provider === "gemini") {
    apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    model = configuredModel || "gemini-2.5-flash";
  } else if (provider === "groq") {
    apiKey = Deno.env.get("GROQ_API_KEY") ?? "";
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
    model = configuredModel || "llama-3.3-70b-versatile";
  } else if (provider === "openrouter") {
    apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
    endpoint = "https://openrouter.ai/api/v1/chat/completions";
    model = configuredModel || "meta-llama/llama-3.3-70b-instruct:free";
  } else if (provider === "ollama") {
    apiKey = Deno.env.get("OLLAMA_API_KEY") ?? "";
    const ollamaBase = (Deno.env.get("OLLAMA_BASE_URL") ?? (apiKey ? "https://ollama.com/api" : "")).replace(/\/+$/, "");
    model = Deno.env.get("OLLAMA_MODEL") || configuredModel || "llama3.2";
    if (ollamaBase) {
      isOllamaNative = true;
      endpoint = ollamaBase.endsWith("/chat") ? ollamaBase : `${ollamaBase}/chat`;
    }
  } else if (provider === "custom") {
    apiKey = Deno.env.get("CUSTOM_AI_API_KEY") ?? Deno.env.get("OPENAI_API_KEY") ?? "";
    const baseUrl = (Deno.env.get("CUSTOM_AI_BASE_URL") ?? Deno.env.get("OPENAI_BASE_URL") ?? "").replace(/\/+$/, "");
    endpoint = baseUrl ? `${baseUrl}/chat/completions` : "";
    model = configuredModel || Deno.env.get("AI_MODEL") || "default";
  }

  const hasCredential = provider === "ollama" ? Boolean(endpoint && (apiKey || Deno.env.get("OLLAMA_BASE_URL"))) : Boolean(endpoint && apiKey);

  if (!hasCredential) {
    return Response.json(
      {
        error: "AI_PROVIDER_NOT_CONFIGURED",
        provider,
        message: `AI provider "${provider}" is not configured yet. Configure the corresponding server API key or self-hosted Ollama URL in Supabase Edge Function secrets or Vercel environment variables.`,
      },
      { status: 503, headers: corsHeaders }
    );
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const payload = isOllamaNative
      ? { model, messages, stream: false }
      : { model, messages, temperature: 0.45 };

    const aiResp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return Response.json(
        {
          error: "AI_UPSTREAM_ERROR",
          provider,
          status: aiResp.status,
          message: `Upstream AI provider returned HTTP ${aiResp.status}. Please verify the configured model (${model}) and API credentials.`,
          detail: errText.slice(0, 300),
        },
        { status: 502, headers: corsHeaders }
      );
    }

    const aiJson = await aiResp.json();
    const reply: string =
      aiJson?.choices?.[0]?.message?.content ??
      aiJson?.message?.content ??
      "";
    const tokensUsed: number =
      Number(aiJson?.usage?.total_tokens ?? ((aiJson?.prompt_eval_count ?? 0) + (aiJson?.eval_count ?? 0))) || 0;

    if (!reply) {
      return Response.json(
        { error: "AI_EMPTY_RESPONSE", provider, message: "AI provider returned an empty response." },
        { status: 502, headers: corsHeaders }
      );
    }

    return Response.json(
      {
        reply,
        provider,
        model,
        tokensUsed,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return Response.json(
      {
        error: "AI_NETWORK_ERROR",
        provider,
        message: err instanceof Error ? err.message : "Failed to connect to AI provider.",
      },
      { status: 502, headers: corsHeaders }
    );
  }
});
