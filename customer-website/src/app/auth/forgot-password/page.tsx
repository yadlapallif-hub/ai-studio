"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showCodeBox, setShowCodeBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);
    setRateLimited(false);
    setMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    try {
      const res = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "recovery",
          email: trimmedEmail,
          next: "/auth/reset-password",
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
        setError(json.error || json.message || "Unable to send password recovery email.");
      } else {
        setSent(true);
        setShowCodeBox(true);
        setMessage(
          json.message ||
            `Password reset link sent to ${trimmedEmail}. It works across desktop and mobile browsers.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed sending password recovery link.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !recoveryCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verErr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: recoveryCode.trim(),
        type: "recovery",
      });
      if (verErr) {
        setError(verErr.message);
        return;
      }
      router.push("/auth/reset-password");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid recovery code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-7 shadow-sm">
        <h1 className="text-xl font-bold">Reset your password</h1>
        <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
          Enter your email address and we will send a cross-device password recovery link.
        </p>

        {sent && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-teal-500/30 bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message || "Password reset link sent. Check your inbox."}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 space-y-2.5 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            {rateLimited && (
              <div className="flex flex-wrap gap-2 pl-6">
                <SafeNavLink
                  href="/auth/login"
                  className="rounded-lg bg-red-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-800"
                >
                  Back to Sign In
                </SafeNavLink>
                <button
                  type="button"
                  onClick={() => setShowCodeBox(true)}
                  className="cursor-pointer rounded-lg border border-red-600/40 px-3 py-1.5 text-[11px] font-semibold hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  Enter Existing Code
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Email Address</label>
            <div className="relative">
              <Mail className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
              <input
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
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send Reset Link
          </button>
        </form>

        <div className="mt-4 border-t border-[var(--fcs-border)] pt-4">
          {!showCodeBox ? (
            <button
              type="button"
              onClick={() => setShowCodeBox(true)}
              className="cursor-pointer text-xs font-medium text-[var(--fcs-ink-muted)] hover:text-teal-700"
            >
              Already have a verification / recovery code?
            </button>
          ) : (
            <form onSubmit={handleVerifyRecoveryCode} className="space-y-3">
              <label className="block text-xs font-semibold">Enter Recovery Code from Email</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={12}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="12345678"
                    className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 font-mono text-sm tracking-widest outline-none focus:border-teal-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !recoveryCode.trim()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-teal-700/40 bg-teal-50 px-3.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-60 dark:bg-teal-950/40 dark:text-teal-200"
                >
                  Verify <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-5 text-center text-xs">
          <SafeNavLink href="/auth/login" className="font-semibold text-teal-700 hover:underline">
            Back to Sign In
          </SafeNavLink>
        </div>
      </div>
    </div>
  );
}
