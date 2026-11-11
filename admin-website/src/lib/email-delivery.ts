import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { hasAdminPortalAccess, type AppRole } from "@francis/shared";
import { createServiceSupabase } from "@/lib/supabase/server";

function getSafeAdminOrigin(requestOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = requestOrigin || configured || "https://francis-creator-studio-admin.vercel.app";
  return base.replace(/\/+$/, "");
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

export async function dispatchAdminMagicLink(params: {
  email: string;
  next?: string;
  requestOrigin?: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const service = createServiceSupabase();

  const { data: profile } = await service
    .from("fcs_profiles")
    .select("id, status")
    .ilike("email", cleanEmail)
    .maybeSingle();

  if (!profile?.id) {
    return {
      ok: false,
      status: 403,
      code: "not_staff",
      message:
        "No Admin Staff account found for that email. Customer accounts cannot log into the Admin Portal.",
    };
  }

  if (profile.status === "suspended") {
    return {
      ok: false,
      status: 403,
      code: "suspended",
      message: "This staff account is suspended. Contact a Super Admin.",
    };
  }

  const { data: roleRows } = await service
    .from("fcs_user_roles")
    .select("role")
    .eq("user_id", profile.id);

  const roles = (roleRows ?? []).map((r) => r.role as AppRole);
  if (!hasAdminPortalAccess(roles)) {
    return {
      ok: false,
      status: 403,
      code: "not_staff",
      message:
        "Access denied: Customer accounts cannot log into the Admin Portal. Only Super Admin, Admin, Super Agent (Customer Support), and Content Manager accounts are allowed.",
    };
  }

  const origin = getSafeAdminOrigin(params.requestOrigin);
  const safeNext =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  // Path 1: Custom Resend relay when RESEND_API_KEY is configured
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const { data, error } = await service.auth.admin.generateLink({
        type: "magiclink",
        email: cleanEmail,
        options: { redirectTo },
      });

      if (!error && data?.properties?.hashed_token) {
        const callbackUrl = `${origin}/auth/callback?token_hash=${encodeURIComponent(
          data.properties.hashed_token
        )}&type=magiclink&next=${encodeURIComponent(safeNext)}`;

        const fromAddress =
          process.env.RESEND_FROM_EMAIL?.trim() || "CREATOR STUDIO Admin <onboarding@resend.dev>";

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [cleanEmail],
            subject: "Admin Portal Sign-In Link — CREATOR STUDIO",
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:28px;">
              <h2 style="margin:0 0 10px;">CREATOR STUDIO Admin Portal</h2>
              <p style="color:#4b5563;font-size:14px;">Click below on any device to access the Admin &amp; Super Agent console:</p>
              <p><a href="${callbackUrl}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Open Admin Portal</a></p>
              ${
                data.properties.email_otp
                  ? `<p style="font-size:12px;color:#6b7280;">Verification code: <strong style="font-family:monospace;font-size:16px;">${data.properties.email_otp}</strong></p>`
                  : ""
              }
            </div>`,
          }),
        });

        if (res.ok) {
          return {
            ok: true,
            status: 200,
            message: `Cross-device Admin sign-in link sent to ${cleanEmail}.`,
          };
        }
      }
    } catch {
      // fall back cleanly to Supabase implicit emailer
    }
  }

  // Path 2: Supabase implicit flow emailer (works cross-device without PKCE)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, status: 500, code: "config_error", message: "Supabase config missing." };
  }

  const anonClient = createSupabaseJsClient(url, anonKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await anonClient.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    if (isRateLimitMessage(error.message)) {
      return {
        ok: false,
        status: 429,
        code: "rate_limited",
        message:
          "Email sending reached Supabase's built-in hourly limit (2 emails/hour). Sign in using Email & Password right now.",
      };
    }
    return { ok: false, status: 400, code: "provider_error", message: error.message };
  }

  return {
    ok: true,
    status: 200,
    message: `Cross-device sign-in link sent to ${cleanEmail}. Click the link or enter the code from your email.`,
  };
}
