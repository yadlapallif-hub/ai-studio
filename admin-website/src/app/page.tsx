import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Award,
  Bot,
  FileText,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const admin = await getAdminContext();
  if (!admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--adm-bg)] px-4 text-center">
        <ShieldAlert className="h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-2xl font-bold">Access Denied — Admin Role Required</h1>
        <p className="mt-2 max-w-md text-sm text-[var(--adm-ink-muted)]">
          Your signed-in account does not hold an active Administrator, Support Agent, Content
          Manager, or Super Admin role.
        </p>
        <Link
          href="/login"
          className="mt-6 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In with Admin Account
        </Link>
      </div>
    );
  }

  const service = createServiceSupabase();
  const [
    { count: userCount },
    { count: resumeCount },
    { count: certCount },
    { count: openTicketCount },
    { count: pendingVerifyCount },
    { count: pendingIssuerCount },
    { count: aiCallsCount },
    { data: recentLogs },
    { data: recentTickets },
    { data: allResumes },
    { data: allCerts },
  ] = await Promise.all([
    service.from("fcs_profiles").select("id", { count: "exact", head: true }),
    service.from("fcs_resumes").select("id", { count: "exact", head: true }),
    service.from("fcs_certificates").select("id", { count: "exact", head: true }),
    service
      .from("fcs_support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    service
      .from("fcs_certificate_verifications")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending_approval"),
    service
      .from("fcs_authorized_issuers")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    service.from("fcs_ai_messages").select("id", { count: "exact", head: true }).eq("role", "assistant"),
    service
      .from("fcs_activity_logs")
      .select("id, action, entity_type, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    service
      .from("fcs_support_tickets")
      .select("id, ticket_number, subject, priority, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(6),
    service.from("fcs_resumes").select("created_at").limit(200),
    service.from("fcs_certificates").select("created_at").limit(200),
  ]);

  if (!admin.userId) redirect("/login");

  // Compute last 7 days real activity bars
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const resumesOnDay = (allResumes ?? []).filter((r) => r.created_at?.startsWith(key)).length;
    const certsOnDay = (allCerts ?? []).filter((c) => c.created_at?.startsWith(key)).length;
    return { label: key.slice(5), resumes: resumesOnDay, certs: certsOnDay };
  });
  const maxBar = Math.max(1, ...days.map((d) => d.resumes + d.certs));

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Operations Overview</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Real-time database statistics across users, documents, verifications, support, and AI
            usage.
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Registered Users", value: userCount ?? 0, icon: Users, href: "/users" },
            { label: "Saved Resumes", value: resumeCount ?? 0, icon: FileText, href: "/analytics" },
            { label: "Saved Certificates", value: certCount ?? 0, icon: Award, href: "/verifications" },
            {
              label: "Active Support Tickets",
              value: openTicketCount ?? 0,
              icon: LifeBuoy,
              href: "/messages",
            },
            {
              label: "Pending Cert Verifications",
              value: pendingVerifyCount ?? 0,
              icon: ShieldCheck,
              href: "/verifications",
            },
            {
              label: "Pending Issuer Apps",
              value: pendingIssuerCount ?? 0,
              icon: ShieldAlert,
              href: "/verifications",
            },
            { label: "AI API Requests", value: aiCallsCount ?? 0, icon: Bot, href: "/ai" },
            { label: "Recent Audit Events", value: (recentLogs ?? []).length, icon: Activity, href: "/audit" },
          ].map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 transition hover:border-teal-600/50"
            >
              <div className="flex items-center justify-between text-xs text-[var(--adm-ink-muted)]">
                <span>{kpi.label}</span>
                <kpi.icon className="h-4 w-4 text-teal-600" />
              </div>
              <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
            </Link>
          ))}
        </div>

        {/* Interactive Real 7-Day SVG Bar Chart + Open Queue */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">7-Day Document Creation Activity</h2>
                <p className="text-xs text-[var(--adm-ink-muted)]">
                  Live database count of resumes and certificates created per day
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> Resumes
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Certificates
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-7 items-end gap-3 h-44">
              {days.map((d) => {
                const resH = Math.round((d.resumes / maxBar) * 120);
                const certH = Math.round((d.certs / maxBar) * 120);
                return (
                  <div key={d.label} className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-32">
                      <div
                        style={{ height: Math.max(4, resH) }}
                        title={`Resumes: ${d.resumes}`}
                        className="w-3.5 rounded-t bg-teal-600 transition-all"
                      />
                      <div
                        style={{ height: Math.max(4, certH) }}
                        title={`Certificates: ${d.certs}`}
                        className="w-3.5 rounded-t bg-amber-500 transition-all"
                      />
                    </div>
                    <span className="font-mono text-[10px] text-[var(--adm-ink-muted)]">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Recent Support Queue</h2>
              <Link href="/messages" className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                Open Inbox →
              </Link>
            </div>
            {(recentTickets ?? []).length === 0 ? (
              <p className="mt-4 text-xs text-[var(--adm-ink-muted)]">
                No support tickets have been opened yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {(recentTickets ?? []).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">{t.subject}</p>
                      <p className="font-mono text-[10px] text-[var(--adm-ink-muted)]">
                        {t.ticket_number} • {t.priority}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 rounded bg-[var(--adm-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Audit Trail */}
        <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Recent Audit Events</h2>
            <Link href="/audit" className="text-xs font-semibold text-teal-700 dark:text-teal-400">
              Full Audit Log →
            </Link>
          </div>
          {(recentLogs ?? []).length === 0 ? (
            <p className="mt-3 text-xs text-[var(--adm-ink-muted)]">No audit events recorded yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--adm-border)] text-[var(--adm-ink-muted)]">
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentLogs ?? []).map((log) => (
                    <tr key={log.id} className="border-b border-[var(--adm-border)]/50">
                      <td className="py-2 pr-4 font-mono font-semibold">{log.action}</td>
                      <td className="py-2 pr-4">{log.entity_type}</td>
                      <td className="py-2 text-[var(--adm-ink-muted)]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
