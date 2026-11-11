import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { UsersClient } from "@/components/UsersClient";
import { RestrictedAccessPanel } from "@/components/RestrictedAccessPanel";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSignedInSessionInfo();
  if (!session) redirect("/login");

  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) {
    if (session.hasStaffAccess) {
      return (
        <AdminShell adminName={session.fullName} adminEmail={session.email} roles={session.roles}>
          <RestrictedAccessPanel
            sectionTitle="Users & Role Management"
            allowedHint="Super Admin and Admin roles"
          />
        </AdminShell>
      );
    }
    redirect("/login");
  }

  const service = createServiceSupabase();

  // Ensure all Supabase Auth users appear in fcs_profiles & fcs_user_roles
  try {
    const { data: authList } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (authList?.users?.length) {
      const { data: existingProfiles } = await service.from("fcs_profiles").select("id");
      const existingIds = new Set((existingProfiles ?? []).map((p) => p.id));
      const missingUsers = authList.users.filter((u) => !existingIds.has(u.id));
      if (missingUsers.length > 0) {
        await service.from("fcs_profiles").upsert(
          missingUsers.map((u) => ({
            id: u.id,
            email: u.email ? u.email.toLowerCase() : null,
            phone: u.phone || null,
            full_name:
              (u.user_metadata?.full_name as string | undefined) ||
              (u.user_metadata?.name as string | undefined) ||
              u.email?.split("@")[0] ||
              u.phone ||
              "Creator",
            auth_provider: (u.app_metadata?.provider as string | undefined) || "email",
          })),
          { onConflict: "id" }
        );
        await service.from("fcs_user_roles").upsert(
          missingUsers.map((u) => ({ user_id: u.id, role: "customer" })),
          { onConflict: "user_id,role" }
        );
      }
    }
  } catch {
    // non-fatal if listUsers limit hit
  }

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
          <h1 className="text-2xl font-bold tracking-tight">Users &amp; Role Management</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Super Admins manage all roles; Admins assign lower-level roles (Super Agent Customer
            Support, Content Manager, Customer) and set direct passwords. Assigned staff log into
            this Admin Portal using their Customer Website Email &amp; Password (no OTP needed).
          </p>
        </div>
        <UsersClient
          initialUsers={rows}
          isSuperAdmin={admin.isSuperAdmin}
          isAdmin={admin.isAdmin}
          currentAdminId={admin.userId}
        />
      </div>
    </AdminShell>
  );
}
