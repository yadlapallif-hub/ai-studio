import React from "react";
import { redirect } from "next/navigation";
import {
  Activity,
  Award,
  Bot,
  ClipboardList,
  FileText,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  formatRoleLabel,
  getDefaultAdminRouteForRoles,
  type AppRole,
} from "@francis/shared";
import { canAccessAdminRoute, getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { SignOutAndSwitchButton } from "@/components/SignOutAndSwitchButton";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await getSignedInSessionInfo();
  if (!session) {
    redirect("/login");
  }

  const admin = await getAdminContext();
  if (!admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--adm-bg)] px-4 text-center">
        <ShieldAlert className="h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-2xl font-bold">Access Denied — Customer Accounts Restricted</h1>
        <p className="mt-2 max-w-md text-sm text-[var(--adm-ink-muted)]">
          Customer-only accounts cannot access the CREATOR STUDIO Admin Portal. Only Super Admin,
          Admin, Super Agent (Customer Support), and Content Manager roles are permitted.
        </p>
        <SignOutAndSwitchButton />
      </div>
    );
  }

  if (!canAccessAdminRoute(admin.roles, "overview")) {
    redirect(getDefaultAdminRouteForRoles(admin.roles));
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

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const resumesOnDay = (allResumes ?? []).filter((r) => r.created_at?.startsWith(key)).length;
    const certsOnDay = (allCerts ?? []).filter((c) => c.created_at?.startsWith(key)).length;
    return { label: key.slice(5), resumes: resumesOnDay, certs: certsOnDay };
  });
  const maxBar = Math.max(1, ...days.map((d) => d.resumes + d.certs));

  const staffBadges = admin.roles
    .filter((r) => r !== "customer")
    .map((r) => formatRoleLabel(r))
    .join(" • ");

  const kpis: Array<{
    label: string;
    value: number;
    icon: typeof Users;
    href: string;
    routeKey: string;
  }> = [
    { label: "Registered Users", value: userCount ?? 0, icon: Users, href: "/users", routeKey: "users" },
    { label: "Saved Resumes", value: resumeCount ?? 0, icon: FileText, href: "/analytics", routeKey: "analytics" },
    {
      label: "Saved Certificates",
      value: certCount ?? 0,
      icon: Award,
      href: "/verifications",
      routeKey: "verifications",
    },
    {
      label: "Active Support Tickets",
      value: openTicketCount ?? 0,
      icon: LifeBuoy,
      href: "/messages",
      routeKey: "messages",
    },
    {
      label: "Pending Cert Verifications",
      value: pendingVerifyCount ?? 0,
      icon: ShieldCheck,
      href: "/verifications",
      routeKey: "verifications",
    },
    {
      label: "Pending Issuer Apps",
      value: pendingIssuerCount ?? 0,
      icon: ShieldAlert,
      href: "/verifications",
      routeKey: "verifications",
    },
    { label: "AI API Requests", value: aiCallsCount ?? 0, icon: Bot, href: "/ai", routeKey: "ai" },
    {
      label: "Recent Audit Events",
      value: (recentLogs ?? []).length,
      icon: Activity,
      href: "/audit",
      routeKey: "audit",
    },
  ];

  const resolveSafeHref = (href: string, routeKey: string) =>
    canAccessAdminRoute(admin.roles as AppRole[], routeKey) ? href : "/";

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
              {staffBadges}
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
              Platform Operations Overview
            </h1>
            <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
              Real-time database statistics across users, documents, verifications, customer
              support, and AI usage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canAccessAdminRoute(admin.roles as AppRole[], "tasks") && (
              <SafeNavLink
                href="/tasks"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface)] px-4 py-2 text-xs font-semibold hover:border-teal-600/50"
              >
                <ClipboardList className="h-4 w-4 text-teal-600" />
                Assign Staff Tasks
              </SafeNavLink>
            )}
            {canAccessAdminRoute(admin.roles as AppRole[], "messages") && (
              <SafeNavLink
                href="/messages"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <LifeBuoy className="h-4 w-4" />
                Open Customer Support Desk ({openTicketCount ?? 0} Active)
              </SafeNavLink>
            )}
          </div>
        </div>

        {(pendingIssuerCount ?? 0) > 0 &&
          canAccessAdminRoute(admin.roles as AppRole[], "verifications") && (
            <SafeNavLink
              href="/verifications"
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-50 px-5 py-3.5 text-xs text-amber-900 transition hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>
                  {pendingIssuerCount} Authorized Organization{" "}
                  {pendingIssuerCount === 1 ? "application awaits" : "applications await"} review
                  before accessing Verified issuance.
                </span>
              </div>
              <span className="shrink-0 font-bold underline">Review Now →</span>
            </SafeNavLink>
          )}

        {/* KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const target = resolveSafeHref(kpi.href, kpi.routeKey);
            return (
              <SafeNavLink
                key={kpi.label}
                href={target}
                className="block rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 transition hover:border-teal-600/50"
              >
                <div className="flex items-center justify-between text-xs text-[var(--adm-ink-muted)]">
                  <span>{kpi.label}</span>
                  <kpi.icon className="h-4 w-4 text-teal-600" />
                </div>
                <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
              </SafeNavLink>
            );
          })}
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
              {canAccessAdminRoute(admin.roles as AppRole[], "messages") && (
                <SafeNavLink
                  href="/messages"
                  className="text-xs font-semibold text-teal-700 dark:text-teal-400"
                >
                  Open Inbox →
                </SafeNavLink>
              )}
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
            {canAccessAdminRoute(admin.roles as AppRole[], "audit") && (
              <SafeNavLink
                href="/audit"
                className="text-xs font-semibold text-teal-700 dark:text-teal-400"
              >
                Full Audit Log →
              </SafeNavLink>
            )}
          </div>
          {(recentLogs ?? []).length === 0 ? (
            <p className="mt-3 text-xs text-[var(--adm-ink-muted)]">No activity logged yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--adm-border)] text-xs">
              {(recentLogs ?? []).map((log) => (
                <li key={log.id} className="flex items-center justify-between py-2">
                  <span className="font-mono font-medium">{log.action}</span>
                  <span className="text-[var(--adm-ink-muted)]">
                    {log.entity_type} • {new Date(log.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
