import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { MessagesClient } from "@/components/MessagesClient";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const admin = await getAdminContext(["super_admin", "admin", "support_agent"]);
  if (!admin) redirect("/login");

  const service = createServiceSupabase();
  const [{ data: tickets }, { data: profiles }, { data: attachments }] = await Promise.all([
    service
      .from("fcs_support_tickets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100),
    service.from("fcs_profiles").select("id, email"),
    service.from("fcs_support_attachments").select("id, ticket_id, file_name, storage_path"),
  ]);

  const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const enrichedTickets = (tickets ?? []).map((t) => ({
    ...t,
    customerEmail: emailMap.get(t.user_id) || "Customer",
  }));

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Messages & Support Desk</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Realtime ticket queue, agent assignment, internal notes, and file attachment inspection.
          </p>
        </div>
        <MessagesClient
          initialTickets={enrichedTickets}
          initialAttachments={attachments ?? []}
        />
      </div>
    </AdminShell>
  );
}
