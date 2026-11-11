import { NextResponse, type NextRequest } from "next/server";
import { hasAdminPortalAccess } from "@francis/shared";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createServerSupabase();
  let authOk = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) authOk = true;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type === "magiclink" || type === "email" || type === "signup" || type === "recovery"
        ? type
        : "email") as "magiclink" | "email" | "signup" | "recovery",
    });
    if (!error) authOk = true;
  }

  if (authOk) {
    try {
      await supabase.rpc("fcs_ensure_profile");
    } catch {
      // ignore if profile bootstrap skipped
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const service = createServiceSupabase();
      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        service.from("fcs_profiles").select("status").eq("id", user.id).maybeSingle(),
        service.from("fcs_user_roles").select("role").eq("user_id", user.id),
      ]);

      const roles = (roleRows ?? []).map((r) => r.role);
      if (profile?.status === "suspended" || !hasAdminPortalAccess(roles)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(
            "Access denied: Customer accounts cannot log into the Admin Portal. Staff role required."
          )}`
        );
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication+callback+failed`);
}
