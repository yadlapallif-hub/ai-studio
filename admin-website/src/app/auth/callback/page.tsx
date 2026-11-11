"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { getDefaultAdminRouteForRoles } from "@francis/shared";
import { createClient } from "@/lib/supabase/client";
import { SafeNavLink } from "@/components/ui/SafeNavLink";

export default function AdminAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function completeAdminCallback() {
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

      const rawNext = searchParams.get("next") || "/";
      const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
      const authType = (hashParams.get("type") || searchParams.get("type") || "").toLowerCase();

      const errParam =
        hashParams.get("error_description") ||
        searchParams.get("error_description") ||
        hashParams.get("error") ||
        searchParams.get("error");

      if (errParam) {
        if (active) setError(decodeURIComponent(errParam.replace(/\+/g, " ")));
        return;
      }

      const supabase = createClient();
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const tokenHash = searchParams.get("token_hash");
      const code = searchParams.get("code");

      try {
        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) throw setErr;
        } else if (tokenHash && authType) {
          const validType = (
            ["signup", "recovery", "email", "magiclink", "invite"].includes(authType)
              ? authType
              : "email"
          ) as "signup" | "recovery" | "email" | "magiclink" | "invite";
          const { error: verErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: validType,
          });
          if (verErr) throw verErr;
        } else if (code) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (codeErr) throw codeErr;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) setError("Sign-in link expired or invalid. Please request a fresh link.");
          return;
        }

        try {
          await supabase.rpc("fcs_ensure_profile");
        } catch {}

        const verifyRes = await fetch("/api/admin/auth/verify-access", { cache: "no-store" });
        const verifyJson = (await verifyRes.json().catch(() => ({}))) as {
          error?: string;
          roles?: string[];
        };
        if (!verifyRes.ok) {
          await supabase.auth.signOut();
          if (active) {
            setError(
              verifyJson.error ||
                "Access denied: Customer accounts cannot log into the Admin Portal. Staff role required."
            );
          }
          return;
        }

        const roleHome = getDefaultAdminRouteForRoles(verifyJson.roles ?? []);
        const dest = safeNext === "/" ? roleHome : safeNext;

        if (active) {
          router.replace(dest);
          router.refresh();
        }
      } catch (err) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Authentication callback failed.";
          if (msg.toLowerCase().includes("pkce") || msg.toLowerCase().includes("code verifier")) {
            setError(
              "This link was initiated on another browser or device. Request a fresh link on the Admin Sign-In page."
            );
          } else {
            setError(msg);
          }
        }
      }
    }

    void completeAdminCallback();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--adm-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-7 shadow-lg">
        {error ? (
          <div>
            <div className="flex items-start gap-2.5 text-red-600 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h1 className="text-base font-bold">Admin Sign-In Verification Failed</h1>
                <p className="mt-1 text-xs leading-relaxed text-[var(--adm-ink-muted)]">{error}</p>
              </div>
            </div>
            <SafeNavLink
              href="/login"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <Lock className="h-3.5 w-3.5" /> Return to Admin Login
            </SafeNavLink>
          </div>
        ) : (
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-teal-600" />
            <h1 className="mt-3 text-base font-bold">Verifying Staff Access...</h1>
            <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
              Confirming your CREATOR STUDIO Admin Portal session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
