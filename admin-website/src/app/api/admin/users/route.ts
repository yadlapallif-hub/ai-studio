import { NextResponse } from "next/server";
import { z } from "zod";
import { STAFF_ROLES, type AppRole } from "@francis/shared";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

const UserPatchSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().max(120).optional(),
  headline: z.string().max(180).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  roles: z
    .array(z.enum(["super_admin", "admin", "support_agent", "content_manager", "customer"]))
    .optional(),
});

export async function PATCH(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "support_agent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = UserPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { userId, fullName, headline, status, roles } = parsed.data;
  const service = createServiceSupabase();

  const { data: targetRoleRows } = await service
    .from("fcs_user_roles")
    .select("role")
    .eq("user_id", userId);
  const targetRoles = (targetRoleRows ?? []).map((r) => r.role as AppRole);
  const targetIsStaff = targetRoles.some((r) => STAFF_ROLES.includes(r));
  const targetIsSuperAdmin = targetRoles.includes("super_admin");

  if (roles !== undefined) {
    if (!admin.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only Super Admin can manage user roles." },
        { status: 403 }
      );
    }
    if (userId === admin.userId && !roles.includes("super_admin")) {
      return NextResponse.json(
        { error: "Cannot remove your own Super Admin role." },
        { status: 400 }
      );
    }
    await service.from("fcs_user_roles").delete().eq("user_id", userId);
    const uniqueRoles = Array.from(new Set(roles.length ? roles : ["customer"]));
    await service.from("fcs_user_roles").insert(
      uniqueRoles.map((role) => ({
        user_id: userId,
        role,
        assigned_by: admin.userId,
      }))
    );
  }

  if (
    !admin.isSuperAdmin &&
    ((admin.isAdmin && targetIsSuperAdmin) ||
      (!admin.isAdmin && admin.isSupportAgent && targetIsStaff))
  ) {
    if (status !== undefined || fullName !== undefined || headline !== undefined) {
      return NextResponse.json(
        {
          error:
            "Support Agents can manage customer-only accounts; staff accounts require Admin/Super Admin.",
        },
        { status: 403 }
      );
    }
  }

  const profilePatch: Record<string, unknown> = {};
  if (fullName !== undefined) profilePatch.full_name = fullName.trim();
  if (headline !== undefined) profilePatch.headline = headline.trim();
  if (status !== undefined) {
    if (userId === admin.userId && status === "suspended") {
      return NextResponse.json({ error: "Cannot suspend your own account." }, { status: 400 });
    }
    profilePatch.status = status;
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await service.from("fcs_profiles").update(profilePatch).eq("id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await recordAdminAudit({
    actorId: admin.userId,
    actorRole: admin.roles.find((r) => r !== "customer") || "admin",
    action: "admin.user.updated",
    targetType: "user",
    targetId: userId,
    metadata: { status, roles, editedProfile: Object.keys(profilePatch) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await getAdminContext(["super_admin"]);
  if (!admin) {
    return NextResponse.json({ error: "Super Admin required to delete accounts." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { userId?: string } | null;
  if (!body?.userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (body.userId === admin.userId) {
    return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { error } = await service.auth.admin.deleteUser(body.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAdminAudit({
    actorId: admin.userId,
    actorRole: "super_admin",
    action: "admin.user.deleted",
    targetType: "user",
    targetId: body.userId,
  });

  return NextResponse.json({ ok: true });
}
