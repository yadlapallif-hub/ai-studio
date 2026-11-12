"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SafeNavLink } from "@/components/ui/SafeNavLink";

export default function ResetPasswordPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (active) setHasSession(Boolean(user));
      } finally {
        if (active) setCheckingSession(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
      } else {
        setDone(true);
        setTimeout(() => {
          window.location.assign("/dashboard");
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center justify-center px-4 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12">
        <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-7 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
          <h1 className="mt-3 text-lg font-bold">Recovery Session Expired or Missing</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
            Open your password recovery link directly from your email, or request a fresh reset
            link below.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <SafeNavLink
              href="/auth/forgot-password"
              className="fcs-btn-primary px-4 py-2 text-xs"
            >
              Request Reset Link
            </SafeNavLink>
            <SafeNavLink
              href="/auth/login"
              className="fcs-btn-secondary px-4 py-2 text-xs"
            >
              Back to Sign In
            </SafeNavLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-7 shadow-sm">
        <h1 className="text-xl font-bold">Choose a new password</h1>
        <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
          Set a strong password for your CREATOR STUDIO account.
        </p>

        {done && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            <CheckCircle2 className="h-4 w-4" /> Password updated! Redirecting to dashboard...
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">New Password</label>
            <div className="relative">
              <Lock className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <label className="mb-1.5 block text-xs font-semibold">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 text-sm outline-none focus:border-teal-600"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="fcs-btn-primary w-full cursor-pointer py-2.5 text-sm disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
