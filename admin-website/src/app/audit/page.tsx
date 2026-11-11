import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) redirect("/login");

  const service = createServiceSupabase();
  const { data: logs } = await service
    .from("fcs_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security & Activity Audit Log</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Immutable operational trail across admin edits, role updates, issuer approvals, and
            exports.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-muted)] text-[var(--adm-ink-muted)]">
                <th className="p-3">Action</th>
                <th className="p-3">Target Type / ID</th>
                <th className="p-3">Actor Role</th>
                <th className="p-3">Metadata</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log) => (
                <tr key={log.id} className="border-b border-[var(--adm-border)]/50">
                  <td className="p-3 font-mono font-bold">{log.action}</td>
                  <td className="p-3">
                    {log.entity_type}
                    {log.entity_id ? ` (${log.entity_id})` : ""}
                  </td>
                  <td className="p-3 uppercase">{log.actor_role}</td>
                  <td className="p-3 font-mono text-[10px] text-[var(--adm-ink-muted)]">
                    {JSON.stringify(log.details)}
                  </td>
                  <td className="p-3 whitespace-nowrap text-[var(--adm-ink-muted)]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[var(--adm-ink-muted)]">
                    No activity logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
