import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createServiceSupabase } from "@/lib/supabase/server";

export type AuthEmailKind = "magiclink" | "recovery" | "signup_resend";

export interface SendAuthEmailResult {
  ok: boolean;
  status: number;
  code?: "rate_limited" | "not_found" | "config_error" | "provider_error";
  delivery?: "resend" | "supabase";
  message: string;
}

function getSafeSiteOrigin(requestOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = requestOrigin || configured || "https://francis-creator-studio.vercel.app";
  return base.replace(/\/+$/, "");
}

function createImplicitAnonAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createSupabaseJsClient(url, anonKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function isRateLimitMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("only request this after") ||
    lower.includes("exceeded")
  );
}

async function sendViaResend(params: {
  to: string;
  subject: string;
  heading: string;
  intro: string;
  ctaLabel: string;
  actionUrl: string;
  otpCode?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const fromAddress =
    process.env.RESEND_FROM_EMAIL?.trim() || "CREATOR STUDIO <onboarding@resend.dev>";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #faf8f4; color: #141414;">
      <p style="font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #0f766e; font-weight: 700; margin: 0 0 8px;">CREATOR STUDIO</p>
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #111827;">${params.heading}</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 24px;">${params.intro}</p>
      <a href="${params.actionUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px;">${params.ctaLabel}</a>
      ${
        params.otpCode
          ? `<p style="margin: 22px 0 6px; font-size: 12px; color: #6b7280;">Or enter this verification code directly:</p><p style="font-family: monospace; font-size: 20px; font-weight: 700; letter-spacing: 0.2em; color: #111827; margin: 0;">${params.otpCode}</p>`
          : ""
      }
      <p style="margin-top: 28px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px;">Built by Francis • Works across desktop and mobile browsers.</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [params.to],
      subject: params.subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    return { ok: false, error: errText };
  }
  return { ok: true };
}

export async function dispatchCustomerAuthEmail(params: {
  kind: AuthEmailKind;
  email: string;
  fullName?: string;
  next?: string;
  requestOrigin?: string;
}): Promise<SendAuthEmailResult> {
  const cleanEmail = params.email.trim().toLowerCase();
  const origin = getSafeSiteOrigin(params.requestOrigin);
  const safeNext =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : params.kind === "recovery"
        ? "/auth/reset-password"
        : "/dashboard";

  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  // Path 1: Custom Resend relay when RESEND_API_KEY is configured (unlimited, zero PKCE)
  if (process.env.RESEND_API_KEY?.trim()) {
    try {
      const service = createServiceSupabase();
      const linkType = params.kind === "recovery" ? "recovery" : "magiclink";
      const { data, error } =
        linkType === "recovery"
          ? await service.auth.admin.generateLink({
              type: "recovery",
              email: cleanEmail,
              options: { redirectTo },
            })
          : await service.auth.admin.generateLink({
              type: "magiclink",
              email: cleanEmail,
              options: {
                redirectTo,
                data: params.fullName?.trim()
                  ? { full_name: params.fullName.trim() }
                  : undefined,
              },
            });

      if (error || !data?.properties?.hashed_token) {
        return {
          ok: false,
          status: 400,
          code: "provider_error",
          message: error?.message || "Unable to generate secure email link.",
        };
      }

      const callbackUrl = `${origin}/auth/callback?token_hash=${encodeURIComponent(
        data.properties.hashed_token
      )}&type=${encodeURIComponent(linkType)}&next=${encodeURIComponent(safeNext)}`;

      const emailRes = await sendViaResend({
        to: cleanEmail,
        subject:
          params.kind === "recovery"
            ? "Reset your CREATOR STUDIO password"
            : "Your CREATOR STUDIO sign-in link",
        heading:
          params.kind === "recovery" ? "Password Recovery" : "Sign in to CREATOR STUDIO",
        intro:
          params.kind === "recovery"
            ? "Click the button below on any device or browser to set a new password for your account."
            : "Click the button below on any device or browser to sign in instantly without a password.",
        ctaLabel: params.kind === "recovery" ? "Reset Password" : "Sign In Now",
        actionUrl: callbackUrl,
        otpCode: data.properties.email_otp,
      });

      if (emailRes.ok) {
        return {
          ok: true,
          status: 200,
          delivery: "resend",
          message:
            params.kind === "recovery"
              ? `Password reset link sent to ${cleanEmail}.`
              : `Cross-device sign-in link sent to ${cleanEmail}.`,
        };
      }
    } catch {
      // Fall through cleanly to implicit Supabase delivery
    }
  }

  // Path 2: Supabase built-in emailer using implicit flow (cross-device #access_token, zero PKCE!)
  try {
    const anonClient = createImplicitAnonAuthClient();

    if (params.kind === "recovery") {
      const { error } = await anonClient.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });
      if (error) {
        if (isRateLimitMessage(error.message)) {
          return {
            ok: false,
            status: 429,
            code: "rate_limited",
            message:
              "Email sending reached Supabase's built-in hourly limit (2 emails/hour). Sign in using Email & Password, enter a previously received verification code, or request a direct link from Support.",
          };
        }
        return { ok: false, status: 400, code: "provider_error", message: error.message };
      }
      return {
        ok: true,
        status: 200,
        delivery: "supabase",
        message: `Password reset link sent to ${cleanEmail}. It works on both desktop and mobile browsers.`,
      };
    }

    if (params.kind === "signup_resend") {
      const { error } = await anonClient.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        if (isRateLimitMessage(error.message)) {
          return {
            ok: false,
            status: 429,
            code: "rate_limited",
            message:
              "Email sending reached Supabase's built-in hourly limit (2 emails/hour). Try signing up with Email & Password instead (activates instantly without needing a confirmation email).",
          };
        }
        return { ok: false, status: 400, code: "provider_error", message: error.message };
      }
      return {
        ok: true,
        status: 200,
        delivery: "supabase",
        message: `Confirmation link sent to ${cleanEmail}.`,
      };
    }

    const { error } = await anonClient.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
        data: params.fullName?.trim() ? { full_name: params.fullName.trim() } : undefined,
      },
    });

    if (error) {
      if (isRateLimitMessage(error.message)) {
        return {
          ok: false,
          status: 429,
          code: "rate_limited",
          message:
            "Email sending reached Supabase's built-in hourly limit (2 emails/hour). Switch to Email & Password to sign in or create an account immediately without waiting.",
        };
      }
      return { ok: false, status: 400, code: "provider_error", message: error.message };
    }

    return {
      ok: true,
      status: 200,
      delivery: "supabase",
      message: `Sign-in link sent to ${cleanEmail}. Open it on any device or enter the code from your inbox.`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      code: "config_error",
      message: err instanceof Error ? err.message : "Failed dispatching email link.",
    };
  }
}
