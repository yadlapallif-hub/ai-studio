"use client";

import React, { Suspense, useEffect, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreatorStudioLogo } from "@/components/brand/CreatorStudioLogo";
import {
  GoogleIcon,
  MobileNumberField,
  normalizeE164Phone,
} from "@/components/auth/PhoneInputRow";

type SignupMode = "password" | "phone" | "magic";

interface ProviderStatus {
  googleEnabled: boolean;
}

function SignupForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || searchParams.get("redirect") || "/dashboard";
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [mode, setMode] = useState<SignupMode>("password");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

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
          fullName: fullName.trim() || undefined,
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
        setError(json.error || json.message || "Unable to send email link.");
        return;
      }

      setInfo(
        json.message ||
          `Confirmation & sign-in link sent to ${trimmedEmail}. Open it on any browser or phone to activate your Creator Studio account.`
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
    setRateLimited(false);

    if (fullName.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
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
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "email",
          fullName: fullName.trim(),
          email: normalizedEmail,
          password,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "Unable to create account.");
        return;
      }

      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      try {
        await supabase.rpc("fcs_ensure_profile");
      } catch {}

      window.location.assign(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhonePasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setRateLimited(false);

    if (fullName.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const e164Phone = normalizeE164Phone(countryCode, phoneNumber);
    if (!/^\+[1-9]\d{7,14}$/.test(e164Phone)) {
      setError("Enter a valid mobile number with country code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "phone",
          fullName: fullName.trim(),
          phone: e164Phone,
          password,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "Unable to create mobile account.");
        return;
      }

      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        phone: e164Phone,
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      try {
        await supabase.rpc("fcs_ensure_profile");
      } catch {}

      window.location.assign(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create mobile account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-7 shadow-lg">
        <div className="flex items-center gap-3">
          <CreatorStudioLogo size={38} className="shrink-0" />
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              CREATOR STUDIO &bull; Free Forever
            </p>
            <h1 className="text-xl font-bold tracking-tight">Create your free account</h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--fcs-ink-muted)]">
          Sign up instantly with Email &amp; Password or Mobile &amp; Password — zero OTP wait — or
          use a cross-device Email Link.
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
                  className="fcs-btn-primary cursor-pointer px-3 py-1.5 text-[11px]"
                >
                  Use Email &amp; Password →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("phone");
                    setError(null);
                    setRateLimited(false);
                  }}
                  className="fcs-btn-secondary cursor-pointer px-3 py-1.5 text-[11px]"
                >
                  Use Mobile &amp; Password →
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
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="fcs-btn-secondary mt-5 w-full cursor-pointer py-2.5 text-sm"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              <span>Continue with Google</span>
            </button>

            <div className="my-4 flex items-center gap-3 text-[11px] text-[var(--fcs-ink-muted)]">
              <div className="h-px flex-1 bg-[var(--fcs-border)]" />
              <span>or sign up directly</span>
              <div className="h-px flex-1 bg-[var(--fcs-border)]" />
            </div>
          </>
        )}

        <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-1 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
              setRateLimited(false);
            }}
            className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg py-2 transition ${
              mode === "password"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Lock className="h-3 w-3" /> Email
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("phone");
              setError(null);
              setRateLimited(false);
            }}
            className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg py-2 transition ${
              mode === "phone"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Phone className="h-3 w-3" /> Mobile
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
              setRateLimited(false);
            }}
            className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg py-2 transition ${
              mode === "magic"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Sparkles className="h-3 w-3" /> Email Link
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
              className="fcs-btn-primary w-full cursor-pointer py-2.5 text-sm disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              <span>{loading ? "Sending link..." : "Send Sign-Up Email Link"}</span>
            </button>
          </form>
        ) : (
          <form
            onSubmit={mode === "phone" ? handlePhonePasswordSignup : handlePasswordSignup}
            className="mt-4 space-y-4"
          >
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

            {mode === "phone" ? (
              <MobileNumberField
                id="signup-phone"
                countryCode={countryCode}
                onCountryCodeChange={setCountryCode}
                phoneNumber={phoneNumber}
                onPhoneNumberChange={setPhoneNumber}
              />
            ) : (
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
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="signup-password">
                Password (min. 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-10 pl-9 text-sm outline-none focus:border-teal-600"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute top-2 right-2.5 cursor-pointer rounded p-0.5 text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
                  type={showPassword ? "text" : "password"}
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
              className="fcs-btn-primary w-full cursor-pointer py-2.5 text-sm disabled:opacity-60"
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
