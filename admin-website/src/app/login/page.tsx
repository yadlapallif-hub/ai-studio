"use client";

import React, { useEffect, useState } from "react";
import { getDefaultAdminRouteForRoles } from "@francis/shared";
import { AlertCircle, Eye, EyeOff, Lock, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreatorStudioLogo } from "@/components/brand/CreatorStudioLogo";

export default function AdminLoginPage() {
  const [loginKind, setLoginKind] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      if (loginKind === "phone") {
        const cleaned = phone.trim().replace(/[\s()-]/g, "");
        const normalizedPhone = cleaned.startsWith("+")
          ? cleaned
          : `+${cleaned.replace(/\D/g, "")}`;
        const { error: signErr } = await supabase.auth.signInWithPassword({
          phone: normalizedPhone,
          password,
        });
        if (signErr) {
          setError(signErr.message);
          return;
        }
      } else {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signErr) {
          setError(signErr.message);
          return;
        }
      }

      try {
        await supabase.rpc("fcs_ensure_profile");
      } catch {}

      const targetRoute = await verifyAdminRoleAccess();
      if (!targetRoute) return;

      window.location.assign(targetRoute);
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
      <div className="w-full max-w-md rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-8 shadow-lg">
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
          <strong className="text-[var(--adm-ink)]">Customer Website Email or Mobile &amp; Password</strong>{" "}
          — no OTP needed. Each role opens only its assigned workspace. Customer-only accounts are
          blocked.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setLoginKind("email");
              setError(null);
            }}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              loginKind === "email"
                ? "bg-[var(--adm-surface)] text-[var(--adm-ink)] shadow-sm"
                : "text-[var(--adm-ink-muted)]"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Email &amp; Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginKind("phone");
              setError(null);
            }}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              loginKind === "phone"
                ? "bg-[var(--adm-surface)] text-[var(--adm-ink)] shadow-sm"
                : "text-[var(--adm-ink-muted)]"
            }`}
          >
            <Phone className="h-3.5 w-3.5" /> Mobile &amp; Password
          </button>
        </div>

        <form onSubmit={handlePasswordLogin} className="mt-5 space-y-4">
          {loginKind === "phone" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold">Mobile Number (with +code)</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--adm-ink-muted)]" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+917989596087"
                  className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 pr-3.5 pl-9 text-sm outline-none focus:border-teal-600"
                />
              </div>
            </div>
          ) : (
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
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--adm-ink-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your Customer Website password"
                className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 pr-10 pl-9 text-sm outline-none focus:border-teal-600"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute top-2.5 right-2.5 cursor-pointer rounded p-0.5 text-[var(--adm-ink-muted)] hover:text-[var(--adm-ink)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="adm-btn-primary w-full cursor-pointer py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In to Staff Portal"}
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
