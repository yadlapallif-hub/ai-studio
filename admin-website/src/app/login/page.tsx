"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Lock, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreatorStudioLogo } from "@/components/brand/CreatorStudioLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [authTab, setAuthTab] = useState<"email_only" | "password">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  React.useEffect(() => {
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

  const verifyAdminRoleAccess = async (): Promise<boolean> => {
    const res = await fetch("/api/admin/auth/verify-access", { cache: "no-store" });
    if (res.ok) return true;
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    const supabase = createClient();
    await supabase.auth.signOut();
    setError(
      json.error ||
        "Access denied: Customer accounts cannot log into the Admin Portal. Only Super Admin, Admin, Support Agent (Customer Support), and Content Manager roles are allowed."
    );
    return false;
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
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

      const allowed = await verifyAdminRoleAccess();
      if (!allowed) return;

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

  const handleSendEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Enter your staff email address.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (otpErr) {
        setError(otpErr.message);
        return;
      }
      setOtpSent(true);
      setNotice(
        `Check ${trimmedEmail}: click the sign-in link in your inbox or enter the 8-digit code below.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = otpCode.trim();
    if (code.length < 6) {
      setError("Enter the verification code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verErr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: "email",
      });
      if (verErr) {
        setError(verErr.message);
        return;
      }

      const allowed = await verifyAdminRoleAccess();
      if (!allowed) return;

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

      const allowed = await verifyAdminRoleAccess();
      if (!allowed) return;

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
            <h1 className="text-xl font-bold tracking-tight">Admin Portal Login</h1>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[var(--adm-ink-muted)]">
          Restricted exclusively to non-customer staff roles:{" "}
          <strong className="text-[var(--adm-ink)]">
            Super Admin, Admin, Super Agent (Customer Support), and Content Manager
          </strong>
          . Customer-only accounts cannot access this portal.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {!factorId ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("password");
                  setError(null);
                  setNotice(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                  authTab === "password"
                    ? "bg-[var(--adm-surface)] text-[var(--adm-ink)] shadow-xs"
                    : "text-[var(--adm-ink-muted)]"
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> Email &amp; Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("email_only");
                  setError(null);
                  setNotice(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                  authTab === "email_only"
                    ? "bg-[var(--adm-surface)] text-[var(--adm-ink)] shadow-xs"
                    : "text-[var(--adm-ink-muted)]"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Just Email
              </button>
            </div>

            {authTab === "password" ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Staff Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--adm-ink-muted)]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@organization.com"
                      className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 pr-3.5 pl-9 text-sm"
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
                      className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 pr-3.5 pl-9 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full cursor-pointer rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {loading ? "Authenticating..." : "Sign In to Admin Portal"}
                </button>
              </form>
            ) : !otpSent ? (
              <form onSubmit={handleSendEmailSignIn} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Staff Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--adm-ink-muted)]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@organization.com"
                      className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] py-2.5 pr-3.5 pl-9 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full cursor-pointer rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {loading ? "Sending Sign-In Link..." : "Send Staff Sign-In Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailCode} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    8-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="12345678"
                    maxLength={10}
                    className="w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3.5 py-2.5 text-center font-mono text-lg tracking-widest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full cursor-pointer rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify & Open Admin Portal"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode("");
                    setNotice(null);
                  }}
                  className="w-full cursor-pointer text-xs font-semibold text-[var(--adm-ink-muted)] hover:underline"
                >
                  Use another email
                </button>
              </form>
            )}

            {googleEnabled && (
              <>
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
                  <span>Continue with Google Admin Account</span>
                </button>
              </>
            )}
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
              className="w-full cursor-pointer rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white"
            >
              {loading ? "Verifying MFA..." : "Verify Code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
