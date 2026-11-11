import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

const RecoveryLinkSchema = z.object({
  userId: z.string().uuid(),
  kind: z.enum(["recovery", "magiclink"]).default("recovery"),
});

export async function POST(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) {
    return NextResponse.json(
      { error: "Only Admin or Super Admin can generate direct recovery links." },
      { status: 403 }
    );
  }

  const parsed = RecoveryLinkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { userId, kind } = parsed.data;

  const [{ data: profile }, { data: targetRoleRows }] = await Promise.all([
    service.from("fcs_profiles").select("id, email, status").eq("id", userId).maybeSingle(),
    service.from("fcs_user_roles").select("role").eq("user_id", userId),
  ]);

  const targetRoles = (targetRoleRows ?? []).map((r) => r.role);
  if (targetRoles.includes("super_admin") && !admin.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only a Super Admin can generate recovery links for another Super Admin." },
      { status: 403 }
    );
  }

  let targetEmail = profile?.email || null;
  if (!targetEmail) {
    const { data: authUserRes } = await service.auth.admin.getUserById(userId);
    targetEmail = authUserRes?.user?.email || null;
  }

  if (!targetEmail) {
    return NextResponse.json(
      { error: "This account does not have an email address linked." },
      { status: 400 }
    );
  }

  const customerBase = (
    process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL || "https://francis-creator-studio.vercel.app"
  ).replace(/\/+$/, "");

  const nextPath = kind === "recovery" ? "/auth/reset-password" : "/dashboard";
  const redirectTo = `${customerBase}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data, error } = await service.auth.admin.generateLink({
    type: kind,
    email: targetEmail.toLowerCase(),
    options: { redirectTo },
  });

  if (error || !data?.properties?.hashed_token) {
    return NextResponse.json(
      { error: error?.message || "Failed generating recovery link." },
      { status: 500 }
    );
  }

  const directUrl = `${customerBase}/auth/callback?token_hash=${encodeURIComponent(
    data.properties.hashed_token
  )}&type=${encodeURIComponent(kind)}&next=${encodeURIComponent(nextPath)}`;

  await recordAdminAudit({
    actorId: admin.userId,
    actorRole: admin.roles.find((r) => r !== "customer") || "admin",
    action: "admin.user.recovery_link_generated",
    targetType: "user",
    targetId: userId,
    metadata: { email: targetEmail, kind },
  });

  return NextResponse.json({
    ok: true,
    email: targetEmail,
    kind,
    link: directUrl,
  });
}
