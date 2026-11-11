"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SafeNavLink } from "@/components/ui/SafeNavLink";

type CallbackStatus = "processing" | "pkce_cross_device" | "error" | "done";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [nextPath, setNextPath] = useState<string>("/dashboard");

  // Recovery helpers when an older PKCE ?code= link is opened in another browser/phone
  const [email, setEmail] = useState("");
  const [sendingFresh, setSendingFresh] = useState(false);
  const [freshInfo, setFreshInfo] = useState<string | null>(null);
  const [freshError, setFreshError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    let active = true;

    async function completeAuthCallback() {
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

      const rawNext = searchParams.get("next") || "/dashboard";
      const safeNext =
        rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
      const authType = (hashParams.get("type") || searchParams.get("type") || "").toLowerCase();
      const targetAfterAuth =
        authType === "recovery" && !safeNext.startsWith("/auth/reset-password")
          ? "/auth/reset-password"
          : safeNext;

      if (active) setNextPath(targetAfterAuth);

      const errParam =
        hashParams.get("error_description") ||
        searchParams.get("error_description") ||
        hashParams.get("error") ||
        searchParams.get("error");

      if (errParam) {
        if (active) {
          setErrorMessage(decodeURIComponent(errParam.replace(/\+/g, " ")));
          setStatus("error");
        }
        return;
      }

      const supabase = createClient();

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const tokenHash = searchParams.get("token_hash");
      const code = searchParams.get("code");

      try {
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (tokenHash && authType) {
          const validType = (
            ["signup", "recovery", "email", "magiclink", "invite"].includes(authType)
              ? authType
              : "email"
          ) as "signup" | "recovery" | "email" | "magiclink" | "invite";
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: validType,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            const lower = error.message.toLowerCase();
            if (lower.includes("pkce") || lower.includes("code verifier")) {
              if (active) {
                setStatus("pkce_cross_device");
                setErrorMessage(error.message);
              }
              return;
            }
            throw error;
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) {
            setErrorMessage("Your verification link is missing or has expired. Request a new link below.");
            setStatus("error");
          }
          return;
        }

        try {
          const { data: ensured } = await supabase.rpc("fcs_ensure_profile");
          const profileStatus = (ensured as { profile?: { status?: string } } | null)?.profile
            ?.status;
          if (profileStatus === "suspended") {
            await supabase.auth.signOut();
            if (active) {
              setErrorMessage("Your account has been suspended. Please contact support.");
              setStatus("error");
            }
            return;
          }
        } catch {
          // ignore non-fatal RPC fallback
        }

        if (active) {
          setStatus("done");
          router.replace(targetAfterAuth);
          router.refresh();
        }
      } catch (err) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Authentication callback failed.";
          if (msg.toLowerCase().includes("pkce") || msg.toLowerCase().includes("code verifier")) {
            setStatus("pkce_cross_device");
          } else {
            setStatus("error");
          }
          setErrorMessage(msg);
        }
      }
    }

    void completeAuthCallback();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSendFreshLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFreshError(null);
    setFreshInfo(null);
    setSendingFresh(true);
    try {
      const mode = nextPath.startsWith("/auth/reset-password") ? "recovery" : "magiclink";
      const res = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          email: email.trim(),
          next: nextPath,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !json.ok) {
        setFreshError(json.error || json.message || "Could not send a new email link.");
      } else {
        setFreshInfo(
          json.message ||
            "Fresh cross-device link sent! Open it from any browser or phone to sign in."
        );
      }
    } catch (err) {
      setFreshError(err instanceof Error ? err.message : "Failed sending email link.");
    } finally {
      setSendingFresh(false);
    }
  };

  const handleVerifyOtpInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !otpCode.trim()) return;
    setFreshError(null);
    setSendingFresh(true);
    try {
      const supabase = createClient();
      const otpType = nextPath.startsWith("/auth/reset-password") ? "recovery" : "email";
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: otpType,
      });
      if (error) {
        setFreshError(error.message);
        return;
      }
      try {
        await supabase.rpc("fcs_ensure_profile");
      } catch {}
      router.replace(nextPath);
      router.refresh();
    } finally {
      setSendingFresh(false);
    }
  };

  if (status === "processing" || status === "done") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center justify-center px-4 py-12">
        <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
          <h1 className="mt-4 text-lg font-bold">
            {status === "done" ? "Signed in! Redirecting..." : "Completing secure sign-in..."}
          </h1>
          <p className="mt-1.5 text-xs text-[var(--fcs-ink-muted)]">
            Verifying your session credentials for CREATOR STUDIO.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-7 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h1 className="text-lg font-bold">
              {status === "pkce_cross_device"
                ? "Opened on a Different Browser or Device"
                : "Sign-In Link Needs Refresh"}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[var(--fcs-ink-muted)]">
              {status === "pkce_cross_device"
                ? "This older link was started on another browser or device. Request a fresh cross-device link below (works on any phone or desktop browser) or sign in with your password."
                : errorMessage || "This verification link is invalid or expired."}
            </p>
          </div>
        </div>

        {freshInfo && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-teal-500/30 bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{freshInfo}</span>
          </div>
        )}

        {freshError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{freshError}</span>
          </div>
        )}

        <form onSubmit={handleSendFreshLink} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold">Email Address</label>
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
            disabled={sendingFresh}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {sendingFresh && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Send Fresh Cross-Device Link</span>
          </button>
        </form>

        {email.trim() && (
          <form
            onSubmit={handleVerifyOtpInline}
            className="mt-4 space-y-2.5 border-t border-[var(--fcs-border)] pt-4"
          >
            <label className="block text-xs font-semibold">
              Or enter the verification code from your inbox
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute top-2.5 left-3 h-4 w-4 text-[var(--fcs-ink-muted)]" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Code"
                  className="w-full rounded-xl border border-[var(--fcs-border)] bg-[var(--fcs-surface-muted)] py-2 pr-3 pl-9 font-mono text-sm tracking-widest outline-none focus:border-teal-600"
                />
              </div>
              <button
                type="submit"
                disabled={sendingFresh || !otpCode.trim()}
                className="inline-flex items-center gap-1 rounded-xl border border-teal-700/40 bg-teal-50 px-3.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-60 dark:bg-teal-950/40 dark:text-teal-200"
              >
                Verify <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--fcs-border)] pt-4 text-xs">
          <SafeNavLink
            href="/auth/login"
            className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            <Lock className="h-3.5 w-3.5" /> Sign In with Password
          </SafeNavLink>
          <SafeNavLink
            href="/auth/forgot-password"
            className="font-medium text-[var(--fcs-ink-muted)] hover:text-[var(--fcs-ink)]"
          >
            Reset Password
          </SafeNavLink>
        </div>
      </div>
    </div>
  );
}
