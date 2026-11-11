import { STAFF_ROLES, type AppRole } from "@francis/shared";

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
