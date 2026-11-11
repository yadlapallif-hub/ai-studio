"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Shield, Trash2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/layout/ThemeProvider";

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
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
    setSaving(true);
    setErrorMsg(null);
    setSavedMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) setErrorMsg(error.message);
      else {
        setNewPassword("");
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
            <label className="mb-1 block text-xs font-semibold">Portfolio / Website</label>
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
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-4 py-2 text-xs font-semibold hover:border-teal-600/40"
          >
            Update Password
          </button>
        </div>
      </form>
    </div>
  );
}
