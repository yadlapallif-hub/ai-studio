import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { AiManagementClient } from "@/components/AiManagementClient";
import { RestrictedAccessPanel } from "@/components/RestrictedAccessPanel";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const session = await getSignedInSessionInfo();
  if (!session) redirect("/login");

  const admin = await getAdminContext(["super_admin"]);
  if (!admin) {
    if (session.hasStaffAccess) {
      return (
        <AdminShell adminName={session.fullName} adminEmail={session.email} roles={session.roles}>
          <RestrictedAccessPanel
            sectionTitle="AI Management"
            allowedHint="Super Admin role"
          />
        </AdminShell>
      );
    }
    redirect("/login");
  }

  const service = createServiceSupabase();
  const [{ data: setting }, { data: usageLogs }, { data: conversations }, { data: profiles }] =
    await Promise.all([
      service.from("fcs_platform_settings").select("value").eq("key", "ai_config").maybeSingle(),
      service
        .from("fcs_ai_messages")
        .select("id, provider, model, error_code, tokens_used, created_at")
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(30),
      service
        .from("fcs_ai_conversations")
        .select("id, user_id, title, context_page, updated_at")
        .order("updated_at", { ascending: false })
        .limit(25),
      service.from("fcs_profiles").select("id, email, phone, ai_recommendations_enabled"),
    ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const optedInConvs = (conversations ?? [])
    .filter((c) => profileMap.get(c.user_id)?.ai_recommendations_enabled !== false)
    .map((c) => ({
      id: c.id,
      title: c.title,
      context_page: c.context_page,
      userEmail:
        profileMap.get(c.user_id)?.email || profileMap.get(c.user_id)?.phone || "User",
      updated_at: c.updated_at,
    }));

  const defaultConfig = {
    enabled: true,
    provider: "ollama",
    model: "llama3.2",
    hourly_limit_per_user: 40,
    privacy_retain_conversations: true,
    recommendations_enabled: true,
    system_instructions:
      "You are Creator AI, the helpful, honest assistant for CREATOR STUDIO (Built by Francis).",
  };

  const providerStatuses = [
    { provider: "ollama", configured: Boolean(process.env.OLLAMA_API_KEY || process.env.OLLAMA_HOST) },
    { provider: "openai", configured: Boolean(process.env.OPENAI_API_KEY) },
    { provider: "gemini", configured: Boolean(process.env.GEMINI_API_KEY) },
    { provider: "groq", configured: Boolean(process.env.GROQ_API_KEY) },
    { provider: "openrouter", configured: Boolean(process.env.OPENROUTER_API_KEY) },
  ];

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant & Intelligence Control</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Manage provider selection, system instructions, daily rate limits, and token analytics
            without exposing raw provider API secrets.
          </p>
        </div>
        <AiManagementClient
          initialConfig={{ ...defaultConfig, ...(setting?.value as object) }}
          isSuperAdmin={admin.isSuperAdmin}
          usageLogs={usageLogs ?? []}
          conversations={optedInConvs}
          providerStatuses={providerStatuses}
        />
      </div>
    </AdminShell>
  );
}
