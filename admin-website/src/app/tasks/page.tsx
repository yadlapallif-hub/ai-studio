import { redirect } from "next/navigation";
import { LOWER_STAFF_ROLES, STAFF_ROLES, type AppRole } from "@francis/shared";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { TasksClient } from "@/components/TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const admin = await getAdminContext(STAFF_ROLES);
  if (!admin) redirect("/login");

  const service = createServiceSupabase();
  const canAssignTasks = admin.isSuperAdmin || admin.isAdmin;

  let tasksQuery = service
    .from("fcs_staff_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(250);

  if (!canAssignTasks) {
    tasksQuery = tasksQuery.eq("assigned_to", admin.userId);
  }

  const [{ data: tasks }, { data: profiles }, { data: roleRows }] = await Promise.all([
    tasksQuery,
    service.from("fcs_profiles").select("id, full_name, email, status"),
    service.from("fcs_user_roles").select("user_id, role"),
  ]);

  const rolesByUser = new Map<string, AppRole[]>();
  for (const row of roleRows ?? []) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row.role as AppRole);
    rolesByUser.set(row.user_id, list);
  }

  const staffLookup: Record<string, { name: string; email: string }> = {};
  const assignableStaff: { id: string; name: string; email: string; roles: string[] }[] = [];

  for (const p of profiles ?? []) {
    staffLookup[p.id] = {
      name: p.full_name || p.email || "Staff Member",
      email: p.email || "",
    };

    if (!canAssignTasks) continue;
    const uRoles = (rolesByUser.get(p.id) ?? []).filter((r) => STAFF_ROLES.includes(r));
    if (uRoles.length === 0) continue;

    if (admin.isSuperAdmin) {
      assignableStaff.push({
        id: p.id,
        name: p.full_name || "Staff Member",
        email: p.email || p.id,
        roles: uRoles,
      });
    } else {
      const isLowerOnly =
        uRoles.some((r) => LOWER_STAFF_ROLES.includes(r)) &&
        !uRoles.includes("super_admin") &&
        !uRoles.includes("admin");
      if (isLowerOnly) {
        assignableStaff.push({
          id: p.id,
          name: p.full_name || "Staff Member",
          email: p.email || p.id,
          roles: uRoles,
        });
      }
    }
  }

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {canAssignTasks ? "Staff Task Delegation" : "My Assigned Tasks"}
          </h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            {admin.isSuperAdmin
              ? "Assign work across Admins, Super Agents (Customer Support), and Content Managers."
              : admin.isAdmin
                ? "Assign and track tasks for lower-level staff (Super Agents and Content Managers)."
                : "View and complete tasks assigned to you by your Admin or Super Admin."}
          </p>
        </div>
        <TasksClient
          initialTasks={tasks ?? []}
          assignableStaff={assignableStaff}
          staffLookup={staffLookup}
          canAssignTasks={canAssignTasks}
          currentAdminId={admin.userId}
        />
      </div>
    </AdminShell>
  );
}
