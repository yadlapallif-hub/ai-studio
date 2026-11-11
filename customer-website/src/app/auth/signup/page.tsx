"use client";

import React, { Suspense, useEffect, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreatorStudioLogo } from "@/components/brand/CreatorStudioLogo";
import { GoogleIcon } from "@/components/auth/PhoneInputRow";

type SignupMode = "magic" | "password";

interface ProviderStatus {
  googleEnabled: boolean;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || searchParams.get("redirect") || "/dashboard";
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [mode, setMode] = useState<SignupMode>("magic");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProviderStatus(data as ProviderStatus);
      })
      .catch(() => {});
  }, []);

  const handleGoogleSignup = async () => {
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
      setError(err instanceof Error ? err.message : "Failed to start Google sign-up.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleJustEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          shouldCreateUser: true,
        },
      });

      if (otpErr) {
        setError(otpErr.message);
        return;
      }

      setInfo(
        `Confirmation & sign-in link sent to ${trimmedEmail}. Open your email to activate your Creator Studio account.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send email link.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        return;
      }

      if (data.session) {
        await supabase.rpc("fcs_ensure_profile");
        router.push(safeNext);
        router.refresh();
      } else {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
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
              CREATOR STUDIO • Free Forever
            </p>
            <h1 className="text-xl font-bold tracking-tight">Create your free account</h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--fcs-ink-muted)]">
          Get started with just your email or create a password to save resumes, certificates, and
          vault assets.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
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
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2.5 text-sm font-semibold transition hover:border-teal-600/50 hover:bg-[var(--fcs-surface)] disabled:opacity-60"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              <span>Continue with Google</span>
            </button>

            <div className="my-4 flex items-center gap-3 text-[11px] text-[var(--fcs-ink-muted)]">
              <div className="h-px flex-1 bg-[var(--fcs-border)]" />
              <span>or sign up with email</span>
              <div className="h-px flex-1 bg-[var(--fcs-border)]" />
            </div>
          </>
        )}

        <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              mode === "magic"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Just Email
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              mode === "password"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Lock className="h-3.5 w-3.5" /> Email &amp; Password
          </button>
        </div>

        {mode === "magic" ? (
          <form onSubmit={handleJustEmailSignup} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="signup-magic-name">
                Full Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="signup-magic-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="signup-magic-email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="signup-magic-email"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              <span>{loading ? "Sending link..." : "Continue with Just Email"}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSignup} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="signup-name">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="signup-email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="signup-email"
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
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="signup-password">
                Password (min. 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="signup-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="signup-confirm">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="signup-confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              <span>{loading ? "Creating account..." : "Create Free Account"}</span>
            </button>
          </form>
        )}

        <div className="mt-5 border-t border-[var(--fcs-border)] pt-4 text-center text-xs text-[var(--fcs-ink-muted)]">
          Already have an account?{" "}
          <SafeNavLink
            href={`/auth/login${safeNext !== "/dashboard" ? `?next=${encodeURIComponent(safeNext)}` : ""}`}
            className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            Sign in
          </SafeNavLink>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
