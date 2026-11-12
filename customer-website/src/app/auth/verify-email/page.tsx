"use client";

import React, { Suspense, useState } from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailCheck, RefreshCw } from "lucide-react";

function VerifyEmailContent() {
  const params = useSearchParams();
  const initialEmail = params.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "signup_resend",
          email: email.trim().toLowerCase(),
          next: "/dashboard",
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !json.ok) setError(json.error || json.message || "Failed resending email.");
      else setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-7 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Verify your email address</h1>
        <p className="mt-2 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
          We sent a verification link to{" "}
          <span className="font-semibold text-[var(--fcs-ink)]">{email || "your inbox"}</span>.
          Open the link on any device to activate your account and unlock your Document Vault.
        </p>

        {sent && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-teal-50 p-2.5 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            <CheckCircle2 className="h-4 w-4" /> Verification email resent.
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={resendEmail} className="mt-5 space-y-2.5 text-left">
          <label className="block text-xs font-semibold">Resend verification link</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] px-3 py-2 text-xs outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="fcs-btn-secondary w-full cursor-pointer py-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Resend Confirmation Email
          </button>
        </form>

        <div className="mt-5">
          <SafeNavLink
            href="/auth/login"
            className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            Return to Sign In →
          </SafeNavLink>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
