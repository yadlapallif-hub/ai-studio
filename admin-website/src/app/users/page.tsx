import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { UsersClient } from "@/components/UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) redirect("/login");

  const service = createServiceSupabase();
  const [{ data: profiles }, { data: roles }, { data: resumes }, { data: certs }, { data: tickets }] =
    await Promise.all([
      service.from("fcs_profiles").select("*").order("created_at", { ascending: false }).limit(200),
      service.from("fcs_user_roles").select("user_id, role"),
      service.from("fcs_resumes").select("user_id"),
      service.from("fcs_certificates").select("user_id"),
      service.from("fcs_support_tickets").select("user_id"),
    ]);

  const rows = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    phone: p.phone,
    full_name: p.full_name,
    headline: p.headline,
    status: p.status,
    created_at: p.created_at,
    roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
    resumeCount: (resumes ?? []).filter((r) => r.user_id === p.id).length,
    certCount: (certs ?? []).filter((c) => c.user_id === p.id).length,
    ticketCount: (tickets ?? []).filter((t) => t.user_id === p.id).length,
  }));

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Role Management</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Search users, suspend or reactivate accounts, and manage RBAC roles (Super Admin
            only).
          </p>
        </div>
        <UsersClient
          initialUsers={rows}
          isSuperAdmin={admin.isSuperAdmin}
          currentAdminId={admin.userId}
        />
      </div>
    </AdminShell>
  );
}
