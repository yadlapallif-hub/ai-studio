"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreatorStudioLogo } from "@/components/brand/CreatorStudioLogo";
import {
  GoogleIcon,
  MobileNumberField,
  normalizeE164Phone,
} from "@/components/auth/PhoneInputRow";

type AuthMethod = "email" | "phone";
type PhoneMode = "password" | "otp";

interface ProviderStatus {
  googleEnabled: boolean;
  phoneEnabled: boolean;
  supabaseCallbackUrl?: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || searchParams.get("redirect") || "/dashboard";
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const initialError = searchParams.get("error");

  const [method, setMethod] = useState<AuthMethod>("email");
  const [phoneMode, setPhoneMode] = useState<PhoneMode>("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

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
    const { data: ensured } = await supabase.rpc("fcs_ensure_profile");
    const profile = (ensured as { profile?: { status?: string } } | null)?.profile;
    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      setError("Your account has been suspended. Contact support for assistance.");
      return;
    }
    router.push(safeNext);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setInfo(null);

    if (providerStatus && !providerStatus.googleEnabled) {
      setError(
        `Google OAuth needs to be enabled in Supabase Dashboard → Authentication → Providers → Google (add your Google Client ID & Secret with Authorized Redirect URI: ${providerStatus.supabaseCallbackUrl || "https://ojzcgeckdrvxvkfphtma.supabase.co/auth/v1/callback"}).`
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });
      if (oauthErr) {
        setError(oauthErr.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Google sign-in.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
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

  const handlePhonePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const formattedPhone = normalizeE164Phone(countryCode, phoneNumber);
    if (!/^\+\d{7,15}$/.test(formattedPhone)) {
      setError("Enter a valid mobile number with country code (e.g. +919876543210).");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: phonePassword,
      });

      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      await finalizeSignedInSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with mobile number.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const formattedPhone = normalizeE164Phone(countryCode, phoneNumber);
    if (!/^\+\d{7,15}$/.test(formattedPhone)) {
      setError("Enter a valid mobile number with country code (e.g. +919876543210).");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (otpErr) {
        if (otpErr.message.toLowerCase().includes("provider") || otpErr.message.toLowerCase().includes("sms")) {
          setError(
            `${otpErr.message} — Configure an SMS provider (Twilio / Vonage / MessageBird) in Supabase Auth Settings, or switch to Mobile + Password above for instant sign-in.`
          );
        } else {
          setError(otpErr.message);
        }
        return;
      }
      setOtpSent(true);
      setInfo(`6-digit verification code sent to ${formattedPhone}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send SMS code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const formattedPhone = normalizeE164Phone(countryCode, phoneNumber);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verErr } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode.trim(),
        type: "sms",
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

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <CreatorStudioLogo size={38} className="shrink-0" />
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              FRANCIS Creator Studio
            </p>
            <h1 className="text-xl font-bold tracking-tight">Sign in to your workspace</h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--fcs-ink-muted)]">
          Sign in with Google, Email, or Mobile Number to access resumes, certificates, and vault
          assets.
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

        {/* Google OAuth Sign In */}
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
          <span>or sign in with</span>
          <div className="h-px flex-1 bg-[var(--fcs-border)]" />
        </div>

        {/* Email vs Mobile Number Tabs */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMethod("email");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              method === "email"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("phone");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              method === "phone"
                ? "bg-[var(--fcs-surface)] text-[var(--fcs-ink)] shadow-sm"
                : "text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile Number
          </button>
        </div>

        {method === "email" ? (
          <form onSubmit={handleEmailSubmit} className="mt-4 space-y-4">
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
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  Forgot password?
                </Link>
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              <span>{loading ? "Signing in..." : "Sign In with Email"}</span>
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Phone Password vs SMS OTP Toggle */}
            <div className="flex gap-2 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => {
                  setPhoneMode("password");
                  setOtpSent(false);
                  setError(null);
                }}
                className={`rounded-full px-3 py-1 transition ${
                  phoneMode === "password"
                    ? "bg-teal-700 text-white"
                    : "border border-[var(--fcs-border)] text-[var(--fcs-ink-muted)]"
                }`}
              >
                Mobile + Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoneMode("otp");
                  setError(null);
                }}
                className={`rounded-full px-3 py-1 transition ${
                  phoneMode === "otp"
                    ? "bg-teal-700 text-white"
                    : "border border-[var(--fcs-border)] text-[var(--fcs-ink-muted)]"
                }`}
              >
                SMS OTP Code
              </button>
            </div>

            {phoneMode === "password" ? (
              <form onSubmit={handlePhonePasswordSubmit} className="space-y-4">
                <MobileNumberField
                  id="login-phone"
                  countryCode={countryCode}
                  onCountryCodeChange={setCountryCode}
                  phoneNumber={phoneNumber}
                  onPhoneNumberChange={setPhoneNumber}
                />

                <div>
                  <label className="mb-1.5 block text-xs font-semibold" htmlFor="login-phone-pw">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                    <input
                      id="login-phone-pw"
                      type="password"
                      required
                      minLength={6}
                      value={phonePassword}
                      onChange={(e) => setPhonePassword(e.target.value)}
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
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  <span>{loading ? "Signing in..." : "Sign In with Mobile"}</span>
                </button>
              </form>
            ) : !otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <MobileNumberField
                  id="login-otp-phone"
                  countryCode={countryCode}
                  onCountryCodeChange={setCountryCode}
                  phoneNumber={phoneNumber}
                  onPhoneNumberChange={setPhoneNumber}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  <span>{loading ? "Sending OTP..." : "Send 6-Digit SMS OTP"}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" htmlFor="login-otp-code">
                    Enter 6-Digit SMS Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                    <input
                      id="login-otp-code"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={8}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 font-mono text-sm tracking-widest outline-none focus:border-teal-600"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="rounded-xl border border-[var(--fcs-border)] px-3 py-2 text-xs font-medium"
                  >
                    Change Number
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    <span>{loading ? "Verifying..." : "Verify & Sign In"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-5 border-t border-[var(--fcs-border)] pt-4 text-center text-xs text-[var(--fcs-ink-muted)]">
          New to FRANCIS Creator Studio?{" "}
          <Link
            href={`/auth/signup${safeNext !== "/dashboard" ? `?next=${encodeURIComponent(safeNext)}` : ""}`}
            className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            Create a free account
          </Link>
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
