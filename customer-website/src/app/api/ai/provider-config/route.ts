import { NextRequest, NextResponse } from "next/server";
import { userAiConfigSchema } from "@francis/shared";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const adminDb = createServiceSupabase();
  const { data } = await adminDb
    .from("fcs_user_ai_configs")
    .select("enabled, provider, model, base_url, encrypted_api_key, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({
      config: {
        enabled: false,
        provider: "ollama",
        model: "llama3.2",
        base_url: "",
        hasApiKey: false,
      },
    });
  }

  // Strictly mask secret presence — NEVER return encrypted_api_key or plaintext key to frontend
  return NextResponse.json({
    config: {
      enabled: Boolean(data.enabled),
      provider: data.provider,
      model: data.model,
      base_url: data.base_url || "",
      hasApiKey: Boolean(data.encrypted_api_key),
      updated_at: data.updated_at,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = userAiConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const adminDb = createServiceSupabase();
  const { data: existing } = await adminDb
    .from("fcs_user_ai_configs")
    .select("encrypted_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const nextApiKey = parsed.data.clear_api_key
    ? null
    : parsed.data.api_key && parsed.data.api_key.trim().length > 0
      ? parsed.data.api_key.trim()
      : (existing?.encrypted_api_key ?? null);

  const { data, error } = await adminDb
    .from("fcs_user_ai_configs")
    .upsert({
      user_id: user.id,
      enabled: parsed.data.enabled,
      provider: parsed.data.provider,
      model: parsed.data.model,
      base_url: parsed.data.base_url?.trim() || null,
      encrypted_api_key: nextApiKey,
    })
    .select("enabled, provider, model, base_url, encrypted_api_key, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    config: {
      enabled: data.enabled,
      provider: data.provider,
      model: data.model,
      base_url: data.base_url || "",
      hasApiKey: Boolean(data.encrypted_api_key),
      updated_at: data.updated_at,
    },
  });
}
