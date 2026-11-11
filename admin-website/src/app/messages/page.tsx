import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { MessagesClient } from "@/components/MessagesClient";
import { RestrictedAccessPanel } from "@/components/RestrictedAccessPanel";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const session = await getSignedInSessionInfo();
  if (!session) redirect("/login");

  const admin = await getAdminContext(["super_admin", "admin", "support_agent"]);
  if (!admin) {
    if (session.hasStaffAccess) {
      return (
        <AdminShell adminName={session.fullName} adminEmail={session.email} roles={session.roles}>
          <RestrictedAccessPanel
            sectionTitle="Support Super Agent Desk"
            allowedHint="Super Admin, Admin, and Support Agent roles"
          />
        </AdminShell>
      );
    }
    redirect("/login");
  }

  const service = createServiceSupabase();
  const [
    { data: tickets },
    { data: profiles },
    { data: attachments },
    { data: roles },
    { data: resumes },
    { data: certs },
    { data: issuers },
  ] = await Promise.all([
    service
      .from("fcs_support_tickets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(150),
    service.from("fcs_profiles").select("id, full_name, email, phone, status, created_at"),
    service.from("fcs_support_attachments").select("id, ticket_id, file_name, storage_path"),
    service.from("fcs_user_roles").select("user_id, role"),
    service.from("fcs_resumes").select("user_id"),
    service.from("fcs_certificates").select("user_id"),
    service
      .from("fcs_authorized_issuers")
      .select("user_id, organization_name, verification_status, contact_email"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const resumeCounts = new Map<string, number>();
  for (const r of resumes ?? []) {
    resumeCounts.set(r.user_id, (resumeCounts.get(r.user_id) || 0) + 1);
  }
  const certCounts = new Map<string, number>();
  for (const c of certs ?? []) {
    certCounts.set(c.user_id, (certCounts.get(c.user_id) || 0) + 1);
  }

  const rolesByUser = new Map<string, string[]>();
  for (const r of roles ?? []) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }

  const staffAgents = (profiles ?? [])
    .filter((p) =>
      (rolesByUser.get(p.id) ?? []).some((role) =>
        ["super_admin", "admin", "support_agent"].includes(role)
      )
    )
    .map((p) => ({
      id: p.id,
      label: p.full_name || p.email || p.phone || p.id.slice(0, 8),
      roles: (rolesByUser.get(p.id) ?? []).filter((r) => r !== "customer"),
    }));

  const enrichedTickets = (tickets ?? []).map((t) => {
    const prof = profileMap.get(t.user_id);
    const customerOrgs = (issuers ?? [])
      .filter(
        (iss) =>
          iss.user_id === t.user_id ||
          (prof?.email && iss.contact_email?.toLowerCase() === prof.email.toLowerCase())
      )
      .map((iss) => ({
        organization_name: iss.organization_name,
        verification_status: iss.verification_status,
      }));

    return {
      ...t,
      customerEmail: prof?.email || prof?.phone || "Customer",
      customerName: prof?.full_name || prof?.email || prof?.phone || "Customer",
      customerStatus: prof?.status || "active",
      customerResumes: resumeCounts.get(t.user_id) || 0,
      customerCerts: certCounts.get(t.user_id) || 0,
      customerOrgs,
      customerIsStaff: (rolesByUser.get(t.user_id) ?? []).some((r) => r !== "customer"),
    };
  });

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            Super Agent Customer Support Workspace
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            Customer Messages &amp; Live Support Desk
          </h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Full Super Agent support controls: assign tickets, inspect customer account &amp;
            issuer status, reply in real time, leave internal staff notes, and resolve tickets.
          </p>
        </div>
        <MessagesClient
          initialTickets={enrichedTickets}
          initialAttachments={attachments ?? []}
          staffAgents={staffAgents}
          currentAgentId={admin.userId}
          canManageAccounts={admin.isSuperAdmin || admin.isAdmin}
          canOpenVerifications={
            admin.isSuperAdmin ||
            admin.isAdmin ||
            admin.roles.includes("content_manager")
          }
        />
      </div>
    </AdminShell>
  );
}
