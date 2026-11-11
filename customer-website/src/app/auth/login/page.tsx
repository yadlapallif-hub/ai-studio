"use client";

import React, { Suspense, useEffect, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreatorStudioLogo } from "@/components/brand/CreatorStudioLogo";
import { GoogleIcon } from "@/components/auth/PhoneInputRow";

type EmailLoginMode = "magic" | "password";

interface ProviderStatus {
  googleEnabled: boolean;
  supabaseCallbackUrl?: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || searchParams.get("redirect") || "/dashboard";
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const rawErr = searchParams.get("error");
  const initialError = rawErr
    ? rawErr.toLowerCase().includes("pkce") || rawErr.toLowerCase().includes("code verifier")
      ? "That older link was opened on a different browser or device. Request a fresh link below (now works across all browsers and phones) or sign in with Email & Password."
      : rawErr
    : null;

  const [mode, setMode] = useState<EmailLoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");

  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProviderStatus(data as ProviderStatus);
      })
      .catch(() => {});
  }, []);

  const finalizeSignedInSession = async () => {
    const supabase = createClient();
    try {
      const { data: ensured } = await supabase.rpc("fcs_ensure_profile");
      const profile = (ensured as { profile?: { status?: string } } | null)?.profile;
      if (profile?.status === "suspended") {
        await supabase.auth.signOut();
        setError("Your account has been suspended. Contact support for assistance.");
        return;
      }
    } catch {
      // non-fatal
    }
    router.push(safeNext);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });
      if (oauthErr) setError(oauthErr.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Google sign-in.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleJustEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setRateLimited(false);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "magiclink",
          email: trimmedEmail,
          next: safeNext,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        code?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        if (res.status === 429 || json.code === "rate_limited") {
          setRateLimited(true);
        }
        setError(json.error || json.message || "Unable to send email sign-in link.");
        return;
      }

      setMagicSent(true);
      setInfo(
        json.message ||
          `Sign-in link sent to ${trimmedEmail}. It works across desktop and mobile browsers (or enter the verification code below).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email sign-in link.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verErr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: emailOtp.trim(),
        type: "email",
      });
      if (verErr) {
        setError(verErr.message);
        return;
      }
      await finalizeSignedInSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      await finalizeSignedInSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <CreatorStudioLogo size={38} className="shrink-0" />
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              CREATOR STUDIO
            </p>
            <h1 className="text-xl font-bold tracking-tight">Sign in with Email</h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--fcs-ink-muted)]">
          Enter just your email for a cross-device sign-in link, or sign in instantly with email
          and password.
        </p>

        {error && (
          <div className="mt-4 space-y-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            {rateLimited && mode === "magic" && (
              <div className="flex flex-wrap gap-2 pl-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode("password");
                    setError(null);
                    setRateLimited(false);
                  }}
                  className="cursor-pointer rounded-lg bg-red-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-800"
                >
                  Switch to Email &amp; Password →
                </button>
              </div>
            )}
          </div>
        )}

        {info && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-teal-500/30 bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{info}</span>
          </div>
        )}

        {providerStatus?.googleEnabled && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2.5 text-sm font-semibold transition hover:border-teal-600/50 hover:bg-[var(--fcs-surface)] disabled:opacity-60"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              <span>Continue with Google</span>
            </button>

            <div className="my-4 flex items-center gap-3 text-[11px] text-[var(--fcs-ink-muted)]">
              <div className="h-px flex-1 bg-[var(--fcs-border)]" />
              <span>or use email</span>
              <div className="h-px flex-1 bg-[var(--fcs-border)]" />
            </div>
          </>
        )}

        <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
              setRateLimited(false);
            }}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              mode === "password"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Lock className="h-3.5 w-3.5" /> Email &amp; Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
              setRateLimited(false);
            }}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              mode === "magic"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Just Email Link
          </button>
        </div>

        {mode === "magic" ? (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleJustEmailSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold" htmlFor="login-just-email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                  <input
                    id="login-just-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                <span>
                  {loading
                    ? "Sending email link..."
                    : magicSent
                      ? "Resend Sign-In Email Link"
                      : "Send Email Sign-In Link"}
                </span>
              </button>
            </form>

            {magicSent && (
              <form
                onSubmit={handleVerifyEmailCode}
                className="space-y-3 border-t border-[var(--fcs-border)] pt-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold" htmlFor="login-email-otp">
                    Or Enter Email Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                    <input
                      id="login-email-otp"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={12}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      placeholder="12345678"
                      className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 font-mono text-sm tracking-widest outline-none focus:border-teal-600"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !emailOtp.trim()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-700/40 bg-teal-50 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 disabled:opacity-60 dark:bg-teal-950/50 dark:text-teal-200"
                >
                  <ArrowRight className="h-3.5 w-3.5" /> Verify Code &amp; Sign In
                </button>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleEmailPasswordSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="login-email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold" htmlFor="login-password">
                  Password
                </label>
                <SafeNavLink
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  Forgot password?
                </SafeNavLink>
              </div>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="login-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              <span>{loading ? "Signing in..." : "Sign In with Email"}</span>
            </button>
          </form>
        )}

        <div className="mt-5 border-t border-[var(--fcs-border)] pt-4 text-center text-xs text-[var(--fcs-ink-muted)]">
          New to Creator Studio?{" "}
          <SafeNavLink
            href={`/auth/signup${safeNext !== "/dashboard" ? `?next=${encodeURIComponent(safeNext)}` : ""}`}
            className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            Create a free account
          </SafeNavLink>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
