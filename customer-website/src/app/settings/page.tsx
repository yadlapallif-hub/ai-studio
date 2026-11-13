"use client";

import React, { useEffect, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { Bell, Bot, CheckCircle2, KeyRound, Loader2, Shield, Trash2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/layout/ThemeProvider";

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [themePref, setThemePref] = useState<"light" | "dark" | "system">("system");
  const [aiRecsEnabled, setAiRecsEnabled] = useState(true);
  const [emailNotifsEnabled, setEmailNotifsEnabled] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifPrefs, setNotifPrefs] = useState({
    project_saved: true,
    document_exported: true,
    certificate_generated: true,
    ai_task_completed: true,
    support_ticket_updated: true,
    organization_approved: true,
    in_app_enabled: true,
    email_digest: true,
  });
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState<"ollama" | "gemini" | "groq" | "openai">("gemini");
  const [aiModel, setAiModel] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiHasKey, setAiHasKey] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setSignedIn(false);
          return;
        }
        setSignedIn(true);
        const { data: ensured } = await supabase.rpc("fcs_ensure_profile");
        const p = (ensured as { profile?: Record<string, unknown> } | null)?.profile;
        if (p) {
          setEmail(String(p.email || user.email || ""));
          setFullName(String(p.full_name || ""));
          setHeadline(String(p.headline || ""));
          setBio(String(p.bio || ""));
          setPhone(String(p.phone || user.phone || ""));
          setLocation(String(p.location || ""));
          setWebsite(String(p.website || ""));
          setGithubUrl(String(p.github_url || ""));
          setLinkedinUrl(String(p.linkedin_url || ""));
          setThemePref((p.theme_preference as "light" | "dark" | "system") || "system");
          setAiRecsEnabled(p.ai_recommendations_enabled !== false);
          setEmailNotifsEnabled(p.email_notifications_enabled !== false);
        }

        const [npRes, aiRes] = await Promise.all([
          fetch("/api/notifications/preferences"),
          fetch("/api/ai/provider-config"),
        ]);
        if (npRes.ok) {
          const npJson = (await npRes.json()) as { preferences?: typeof notifPrefs };
          if (npJson.preferences) setNotifPrefs((prev) => ({ ...prev, ...npJson.preferences }));
        }
        if (aiRes.ok) {
          const aiJson = (await aiRes.json()) as {
            config?: {
              enabled?: boolean;
              provider?: "ollama" | "gemini" | "groq" | "openai";
              model?: string | null;
              base_url?: string | null;
              hasApiKey?: boolean;
            };
          };
          if (aiJson.config) {
            setAiEnabled(Boolean(aiJson.config.enabled));
            if (aiJson.config.provider) setAiProvider(aiJson.config.provider);
            setAiModel(aiJson.config.model || "");
            setAiBaseUrl(aiJson.config.base_url || "");
            setAiHasKey(Boolean(aiJson.config.hasApiKey));
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("fcs_profiles")
        .update({
          full_name: fullName.trim(),
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          phone: phone.trim() || null,
          location: location.trim() || null,
          website: website.trim() || null,
          github_url: githubUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          theme_preference: themePref,
          ai_recommendations_enabled: aiRecsEnabled,
          email_notifications_enabled: emailNotifsEnabled,
        })
        .eq("id", user.id);

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (themePref === "light" || themePref === "dark") {
        setTheme(themePref);
      }

      setSavedMsg("Profile and privacy settings saved.");
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters.");
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSavedMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) setErrorMsg(error.message);
      else {
        setNewPassword("");
        setConfirmPassword("");
        setSavedMsg("Account password updated.");
      }
    } finally {
      setSaving(false);
    }
  };

  const clearRecommendationHistory = async () => {
    const res = await fetch("/api/ai/recommend", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearHistory: true }),
    });
    if (res.ok) setSavedMsg("AI recommendation history cleared.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[var(--fcs-ink-muted)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading account settings...
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Shield className="mx-auto h-10 w-10 text-teal-600" />
        <h1 className="mt-4 text-2xl font-bold">Account &amp; Privacy Settings</h1>
        <p className="mt-2 text-xs text-[var(--fcs-ink-muted)]">
          Sign in to edit your profile details, theme preference, AI controls, and password.
        </p>
        <SafeNavLink
          href="/auth/login?next=/settings"
          className="mt-6 inline-block rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Sign In
        </SafeNavLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account & Privacy Settings</h1>
        <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
          Manage your profile identity, AI recommendation controls, notifications, and password.
        </p>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
          <CheckCircle2 className="h-4 w-4" /> {savedMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={saveProfile}
        className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6"
      >
        <h2 className="flex items-center gap-2 text-base font-bold">
          <User className="h-4 w-4 text-teal-600" /> Profile Information
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold">Email</label>
            <input
              type="email"
              disabled
              value={email || "Mobile-only account (no email linked)"}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs opacity-70"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Professional Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Software Engineer • CS Graduate"
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Theme Preference</label>
            <select
              value={themePref}
              onChange={(e) => setThemePref(e.target.value as "light" | "dark" | "system")}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            >
              <option value="system">System Default</option>
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Personal Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">GitHub URL</label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold">Short Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
          />
        </div>

        <div className="space-y-2 border-t border-[var(--fcs-border)] pt-4">
          <label className="flex items-center gap-2.5 text-xs font-medium">
            <input
              type="checkbox"
              checked={aiRecsEnabled}
              onChange={(e) => setAiRecsEnabled(e.target.checked)}
              className="h-4 w-4 accent-teal-700"
            />
            Enable Creator AI personalized dashboard recommendations
          </label>
          <label className="flex items-center gap-2.5 text-xs font-medium">
            <input
              type="checkbox"
              checked={emailNotifsEnabled}
              onChange={(e) => setEmailNotifsEnabled(e.target.checked)}
              className="h-4 w-4 accent-teal-700"
            />
            Receive email notifications for support replies & verification updates
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={clearRecommendationHistory}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--fcs-border)] px-3 py-2 text-xs font-medium text-[var(--fcs-ink-muted)] hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear AI Recommendation History
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile & Preferences"}
          </button>
        </div>
      </form>

      <form
        onSubmit={updatePassword}
        className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6"
      >
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Shield className="h-4 w-4 text-teal-600" /> Security & Password
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="password"
            minLength={8}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min. 8 characters)"
            className="flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
          />
          <input
            type="password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="flex-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-2 text-xs font-semibold hover:border-teal-600/40"
          >
            Update Password
          </button>
        </div>
      </form>

      {/* Granular Notification Preferences */}
      <section className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Bell className="h-4 w-4 text-teal-600" /> Notification Preferences
            </h2>
            <p className="mt-0.5 text-xs text-[var(--fcs-ink-muted)]">
              Choose which workspace events trigger real-time bell notifications.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setErrorMsg(null);
              try {
                const res = await fetch("/api/notifications/preferences", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(notifPrefs),
                });
                if (res.ok) setSavedMsg("Notification preferences saved.");
                else setErrorMsg("Failed to save notification preferences.");
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Save Notifications
          </button>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {(
            [
              ["project_saved", "Project & Resume Saves"],
              ["document_exported", "Document Exports (PDF, PNG, DOCX)"],
              ["certificate_generated", "Certificates & Bulk Generation"],
              ["ai_task_completed", "Creator AI Generation & Health Checks"],
              ["support_ticket_updated", "Support Ticket Admin Replies"],
              ["organization_approved", "Organization Verification Updates"],
              ["in_app_enabled", "In-App Real-Time Bell Alerts"],
              ["email_digest", "Email Activity Summary"],
            ] as Array<[keyof typeof notifPrefs, string]>
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3.5 py-2.5 text-xs font-medium"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={notifPrefs[key]}
                onChange={(e) =>
                  setNotifPrefs((prev) => ({ ...prev, [key]: e.target.checked }))
                }
                className="h-4 w-4 accent-teal-700"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Personal AI Provider Configuration (Server-Only Storage) */}
      <section className="space-y-4 rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Bot className="h-4 w-4 text-teal-600" /> Personal AI Provider Configuration
            </h2>
            <p className="mt-0.5 text-xs text-[var(--fcs-ink-muted)]">
              Optionally override the platform AI model with your own Ollama, Gemini, Groq, or
              OpenAI-compatible endpoint. API keys are stored strictly server-side and never sent
              back to the browser.
            </p>
          </div>
          {aiHasKey && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
              <KeyRound className="h-3 w-3" /> Server Key Saved
            </span>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-xs font-semibold">
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => setAiEnabled(e.target.checked)}
            className="h-4 w-4 accent-teal-700"
          />
          Use my custom AI provider configuration for Creator AI requests
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold">Provider</label>
            <select
              value={aiProvider}
              onChange={(e) =>
                setAiProvider(e.target.value as "ollama" | "gemini" | "groq" | "openai")
              }
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            >
              <option value="ollama">Ollama (Local / Self-Hosted)</option>
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq (Llama / Mixtral)</option>
              <option value="openai">OpenAI / Compatible Endpoint</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Model Name</label>
            <input
              type="text"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder={
                aiProvider === "ollama"
                  ? "llama3.1:8b"
                  : aiProvider === "gemini"
                    ? "gemini-2.0-flash"
                    : aiProvider === "groq"
                      ? "llama-3.3-70b-versatile"
                      : "gpt-4o-mini"
              }
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">
              Base URL {aiProvider === "ollama" ? "(Required for Ollama)" : "(Optional Override)"}
            </label>
            <input
              type="text"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
              placeholder={aiProvider === "ollama" ? "http://localhost:11434" : "https://api.openai.com/v1"}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">
              API Key {aiHasKey ? "(Leave blank to keep existing server key)" : ""}
            </label>
            <input
              type="password"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder={aiHasKey ? "•••••••••••• (Stored securely on server)" : "sk-... or AIza..."}
              className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {aiHasKey && (
            <button
              type="button"
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch("/api/ai/provider-config", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      enabled: aiEnabled,
                      provider: aiProvider,
                      model: aiModel,
                      base_url: aiBaseUrl,
                      clearApiKey: true,
                    }),
                  });
                  if (res.ok) {
                    setAiHasKey(false);
                    setAiApiKey("");
                    setSavedMsg("Stored server API key cleared.");
                  }
                } finally {
                  setSaving(false);
                }
              }}
              className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Clear Stored Key
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setErrorMsg(null);
              try {
                const res = await fetch("/api/ai/provider-config", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    enabled: aiEnabled,
                    provider: aiProvider,
                    model: aiModel,
                    base_url: aiBaseUrl,
                    api_key: aiApiKey.trim() || undefined,
                  }),
                });
                const json = (await res.json()) as {
                  config?: { hasApiKey?: boolean };
                  error?: string;
                };
                if (!res.ok) {
                  setErrorMsg(json.error || "Failed to save AI provider config.");
                } else {
                  setAiApiKey("");
                  if (json.config) setAiHasKey(Boolean(json.config.hasApiKey));
                  setSavedMsg("Personal AI provider settings saved securely on server.");
                }
              } finally {
                setSaving(false);
              }
            }}
            className="ml-auto rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Save AI Provider
          </button>
        </div>
      </section>
    </div>
  );
}
