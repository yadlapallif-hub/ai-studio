"use client";

import React, { useState } from "react";
import { Bot, CheckCircle2, KeyRound, Save } from "lucide-react";

interface AiConfigValue {
  enabled: boolean;
  provider: string;
  model: string;
  hourly_limit_per_user: number;
  privacy_retain_conversations: boolean;
  recommendations_enabled: boolean;
  system_instructions: string;
}

export function AiManagementClient({
  initialConfig,
  isSuperAdmin,
  usageLogs,
  conversations,
  providerStatuses,
}: {
  initialConfig: AiConfigValue;
  isSuperAdmin: boolean;
  usageLogs: Array<{ id: string; provider: string | null; model: string | null; error_code: string | null; tokens_used: number; created_at: string }>;
  conversations: Array<{ id: string; title: string; context_page: string; userEmail: string; updated_at: string }>;
  providerStatuses: Array<{ provider: string; configured: boolean }>;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ai_config", value: config }),
      });
      const json = (await res.json()) as { error?: string };
      setMsg(res.ok ? "AI configuration saved." : json.error || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-2 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          <CheckCircle2 className="h-4 w-4" />
          {msg}
        </div>
      )}

      {/* Secret Readiness Status (never reveals secret values) */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <KeyRound className="h-4 w-4 text-teal-600" />
          Environment Provider Key Readiness (Secrets Masked)
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-5 text-xs">
          {providerStatuses.map((p) => (
            <div
              key={p.provider}
              className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
            >
              <p className="font-bold uppercase">{p.provider}</p>
              <p
                className={`mt-1 text-[11px] font-semibold ${
                  p.configured ? "text-emerald-600" : "text-[var(--adm-ink-muted)]"
                }`}
              >
                {p.configured ? "Env Key Set" : "Not Set"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Super Admin AI Config Form */}
      <form
        onSubmit={saveConfig}
        className="space-y-4 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 text-xs"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Bot className="h-4 w-4 text-teal-600" />
            AI Provider & Instruction Settings
          </h2>
          {!isSuperAdmin && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Super Admin Required to Edit
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2 font-semibold">
            <input
              type="checkbox"
              disabled={!isSuperAdmin}
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="accent-teal-700"
            />
            Platform AI Enabled
          </label>
          <div>
            <label className="mb-1 block font-semibold">Active Provider</label>
            <select
              disabled={!isSuperAdmin}
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
            >
              <option value="none">Unconfigured (Graceful Offline)</option>
              <option value="ollama">Ollama Cloud / Endpoint</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom OpenAI-Compatible</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-semibold">Model Name</label>
            <input
              type="text"
              disabled={!isSuperAdmin}
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="e.g. gpt-4o-mini or gemini-2.5-flash"
              className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">Hourly Limit / User</label>
            <input
              type="number"
              disabled={!isSuperAdmin}
              value={config.hourly_limit_per_user}
              onChange={(e) =>
                setConfig({ ...config, hourly_limit_per_user: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2 font-semibold">
            <input
              type="checkbox"
              disabled={!isSuperAdmin}
              checked={config.recommendations_enabled}
              onChange={(e) =>
                setConfig({ ...config, recommendations_enabled: e.target.checked })
              }
              className="accent-teal-700"
            />
            Smart Recommendations Enabled
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2 font-semibold">
            <input
              type="checkbox"
              disabled={!isSuperAdmin}
              checked={config.privacy_retain_conversations}
              onChange={(e) =>
                setConfig({ ...config, privacy_retain_conversations: e.target.checked })
              }
              className="accent-teal-700"
            />
            Retain Conversation History
          </label>
        </div>

        <div>
          <label className="mb-1 block font-semibold">Admin System Instructions</label>
          <textarea
            rows={4}
            disabled={!isSuperAdmin}
            value={config.system_instructions}
            onChange={(e) => setConfig({ ...config, system_instructions: e.target.value })}
            className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-3"
          />
        </div>

        {isSuperAdmin && (
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save AI Configuration"}
          </button>
        )}
      </form>

      {/* Usage & Privacy-Controlled Conversations */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 text-xs">
          <h3 className="text-sm font-bold">Recent AI Usage Logs ({usageLogs.length})</h3>
          <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
            {usageLogs.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
              >
                <span className="font-mono font-semibold">
                  {u.provider || "default"} / {u.model || "auto"}
                </span>
                <span>
                  {u.error_code || "ok"} • {u.tokens_used} tok
                </span>
              </div>
            ))}
            {usageLogs.length === 0 && (
              <p className="text-[var(--adm-ink-muted)]">No AI API usage logged yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 text-xs">
          <h3 className="text-sm font-bold">
            Opted-In Conversation Activity ({conversations.length})
          </h3>
          <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
            {conversations.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{c.title}</p>
                  <p className="text-[10px] text-[var(--adm-ink-muted)]">
                    {c.userEmail} • {c.context_page}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--adm-ink-muted)]">
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-[var(--adm-ink-muted)]">No user AI conversations recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
