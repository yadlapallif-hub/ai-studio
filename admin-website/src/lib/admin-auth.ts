import {
  STAFF_ROLES,
  hasAdminPortalAccess,
  type AppRole,
} from "@francis/shared";
import { createServerSupabase, createServiceSupabase } from "./supabase/server";

export interface AdminContext {
  userId: string;
  email: string;
  phone: string;
  fullName: string;
  roles: AppRole[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isSupportAgent: boolean;
  isContentManager: boolean;
}

export interface SignedInSessionInfo {
  userId: string;
  email: string;
  phone: string;
  fullName: string;
  roles: AppRole[];
  status: string;
  hasStaffAccess: boolean;
}

export const ADMIN_ROUTE_ROLES: Record<string, readonly AppRole[]> = {
  overview: ["super_admin", "admin", "support_agent", "content_manager"],
  messages: ["super_admin", "admin", "support_agent"],
  users: ["super_admin", "admin", "support_agent"],
  verifications: ["super_admin", "admin", "content_manager", "support_agent"],
  templates: ["super_admin", "admin", "content_manager"],
  website: ["super_admin", "admin", "content_manager"],
  ai: ["super_admin", "admin"],
  analytics: ["super_admin", "admin", "support_agent", "content_manager"],
  audit: ["super_admin", "admin"],
  security: ["super_admin", "admin", "support_agent", "content_manager"],
};

export function canAccessAdminRoute(roles: readonly AppRole[], routeKey: string): boolean {
  const allowed = ADMIN_ROUTE_ROLES[routeKey] ?? STAFF_ROLES;
  return roles.some((r) => r !== "customer" && allowed.includes(r));
}

export async function getSignedInSessionInfo(): Promise<SignedInSessionInfo | null> {
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

  const roles = ((roleRows ?? []).map((r) => r.role) as AppRole[]) || [];
  const status = profile?.status || "active";

  return {
    userId: user.id,
    email: profile?.email || user.email || profile?.phone || user.phone || "Account",
    phone: profile?.phone || user.phone || "",
    fullName:
      profile?.full_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email ||
      "User",
    roles,
    status,
    hasStaffAccess: status !== "suspended" && hasAdminPortalAccess(roles),
  };
}

export async function getAdminContext(
  requiredRoles: readonly AppRole[] = STAFF_ROLES
): Promise<AdminContext | null> {
  const session = await getSignedInSessionInfo();
  if (!session || session.status === "suspended") return null;

  const nonCustomerRequired = requiredRoles.filter((r) => r !== "customer");
  const authorized = session.roles.some(
    (r) => r !== "customer" && nonCustomerRequired.includes(r)
  );

  if (!authorized) {
    return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    phone: session.phone,
    fullName: session.fullName,
    roles: session.roles,
    isSuperAdmin: session.roles.includes("super_admin"),
    isAdmin: session.roles.includes("admin") || session.roles.includes("super_admin"),
    isSupportAgent: session.roles.includes("support_agent"),
    isContentManager: session.roles.includes("content_manager"),
  };
}

export async function recordAdminAudit(params: {
  actorId: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const service = createServiceSupabase();
  await service.from("fcs_activity_logs").insert({
    actor_id: params.actorId,
    actor_role: params.actorRole || "admin",
    action: params.action,
    entity_type: params.targetType,
    entity_id: params.targetId ?? null,
    details: params.metadata ?? {},
  });
}
