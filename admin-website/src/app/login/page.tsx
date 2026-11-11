"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreatorStudioLogo } from "@/components/brand/CreatorStudioLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = factors?.totp?.find((f) => f.status === "verified");
      if (verifiedTotp) {
        setFactorId(verifiedTotp.id);
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (chErr || !challenge) {
        setError(chErr?.message || "MFA challenge failed.");
        return;
      }
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: mfaCode.trim(),
      });
      if (verErr) {
        setError(verErr.message);
        return;
      }
      router.push("/");
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
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const res = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: key },
        }).catch(() => null);
        if (res?.ok) {
          const settings = (await res.json()) as { external?: { google?: boolean } };
          if (!settings.external?.google) {
            setError(
              `Google OAuth needs to be enabled in Supabase Dashboard → Authentication → Providers → Google (Callback URI: ${url}/auth/v1/callback).`
            );
            return;
          }
        }
      }
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
              FRANCIS CREATOR STUDIO
            </p>
            <h1 className="text-xl font-bold tracking-tight">Admin Console Login</h1>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[var(--adm-ink-muted)]">
          Restricted to authorized Super Admins, Administrators, Support Agents, and Content
          Managers. Every action is logged.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!factorId ? (
          <div className="mt-6 space-y-4">
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">Administrator Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yadlapallif@gmail.com"
                  className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3.5 py-2.5 text-sm"
                />
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
                    className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 pr-3.5 pl-9 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {loading ? "Authenticating..." : "Sign In to Console"}
              </button>
            </form>

            <div className="flex items-center gap-3 text-[11px] text-[var(--adm-ink-muted)]">
              <div className="h-px flex-1 bg-[var(--adm-border)]" />
              <span>or</span>
              <div className="h-px flex-1 bg-[var(--adm-border)]" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAdminLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 text-xs font-semibold hover:border-teal-600/50"
            >
              <span>Continue with Google Admin Account</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleMfaVerify} className="mt-6 space-y-4">
            <div className="rounded-xl border border-teal-600/30 bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              <KeyRound className="mb-1 h-4 w-4" />
              Enter the 6-digit TOTP authenticator code to complete sign-in.
            </div>
            <input
              type="text"
              required
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3.5 py-2.5 text-center font-mono text-lg tracking-widest"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white"
            >
              {loading ? "Verifying MFA..." : "Verify Code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
