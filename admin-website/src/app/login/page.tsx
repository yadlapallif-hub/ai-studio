"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail } from "lucide-react";
import { getDefaultAdminRouteForRoles } from "@francis/shared";
import { createClient } from "@/lib/supabase/client";
import { CreatorStudioLogo } from "@/components/brand/CreatorStudioLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const qErr = new URLSearchParams(window.location.search).get("error");
      if (qErr) setError(qErr);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((settings: { external?: { google?: boolean } } | null) => {
        if (settings?.external?.google) setGoogleEnabled(true);
      })
      .catch(() => {});
  }, []);

  const verifyAdminRoleAccess = async (): Promise<string | null> => {
    const res = await fetch("/api/admin/auth/verify-access", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json().catch(() => ({}))) as { roles?: string[] };
      return getDefaultAdminRouteForRoles(json.roles ?? []);
    }
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    const supabase = createClient();
    await supabase.auth.signOut();
    setError(
      json.error ||
        "Access denied: Customer accounts cannot log into the Admin Portal. Staff role required."
    );
    return null;
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }

      const targetRoute = await verifyAdminRoleAccess();
      if (!targetRoute) return;

      router.push(targetRoute);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (oauthErr) setError(oauthErr.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--adm-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-8">
        <div className="flex items-center gap-3">
          <CreatorStudioLogo size={42} className="shrink-0" />
          <div>
            <p className="text-xs font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
              CREATOR STUDIO
            </p>
            <h1 className="text-xl font-bold tracking-tight">Admin &amp; Staff Portal Login</h1>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[var(--adm-ink-muted)]">
          Sign in directly with your{" "}
          <strong className="text-[var(--adm-ink)]">Customer Website Email &amp; Password</strong>{" "}
          — no OTP needed. Each staff role opens only its assigned workspace (Super Admin, Admin,
          Super Agent Customer Support, Content Manager). Customer-only accounts cannot access this
          portal.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--adm-ink-muted)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 pr-3.5 pl-9 text-sm outline-none focus:border-teal-600"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--adm-ink-muted)]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your Customer Website password"
                className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 pr-3.5 pl-9 text-sm outline-none focus:border-teal-600"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In with Email & Password"}
          </button>
        </form>

        {googleEnabled && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-[11px] text-[var(--adm-ink-muted)]">
              <div className="h-px flex-1 bg-[var(--adm-border)]" />
              <span>or</span>
              <div className="h-px flex-1 bg-[var(--adm-border)]" />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAdminLogin}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 text-xs font-semibold hover:border-teal-600/50"
            >
              <span>Continue with Google Account</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
