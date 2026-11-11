import { STAFF_ROLES, type AppRole } from "@francis/shared";
import { createServerSupabase, createServiceSupabase } from "./supabase/server";

export interface AdminContext {
  userId: string;
  email: string;
  phone: string;
  fullName: string;
  roles: AppRole[];
  isSuperAdmin: boolean;
}

export async function getAdminContext(
  requiredRoles: readonly AppRole[] = STAFF_ROLES
): Promise<AdminContext | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const service = createServiceSupabase();
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    service
      .from("fcs_profiles")
      .select("full_name, email, phone, status")
      .eq("id", user.id)
      .maybeSingle(),
    service.from("fcs_user_roles").select("role").eq("user_id", user.id),
  ]);

  if (profile?.status === "suspended") {
    return null;
  }

  const roles = ((roleRows ?? []).map((r) => r.role) as AppRole[]) || [];
  const authorized = roles.some((r) => requiredRoles.includes(r));

  if (!authorized) {
    return null;
  }

  return {
    userId: user.id,
    email: profile?.email || user.email || profile?.phone || user.phone || "Admin",
    phone: profile?.phone || user.phone || "",
    fullName: profile?.full_name || "Admin",
    roles,
    isSuperAdmin: roles.includes("super_admin"),
  };
}

export async function recordAdminAudit(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const service = createServiceSupabase();
  await service.from("fcs_activity_logs").insert({
    actor_id: params.actorId,
    actor_role: "admin",
    action: params.action,
    entity_type: params.targetType,
    entity_id: params.targetId ?? null,
    details: params.metadata ?? {},
  });
}
