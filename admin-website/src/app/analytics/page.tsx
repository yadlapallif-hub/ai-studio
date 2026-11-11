import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { RestrictedAccessPanel } from "@/components/RestrictedAccessPanel";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const session = await getSignedInSessionInfo();
  if (!session) redirect("/login");

  const admin = await getAdminContext([
    "super_admin",
    "admin",
    "support_agent",
    "content_manager",
  ]);
  if (!admin) {
    if (session.hasStaffAccess) {
      return (
        <AdminShell adminName={session.fullName} adminEmail={session.email} roles={session.roles}>
          <RestrictedAccessPanel
            sectionTitle="Platform Analytics"
            allowedHint="Staff roles"
          />
        </AdminShell>
      );
    }
    redirect("/login");
  }

  const service = createServiceSupabase();
  const [{ data: profiles }, { data: resumes }, { data: certs }, { data: exports }, { data: tickets }, { data: aiLogs }] =
    await Promise.all([
      service.from("fcs_profiles").select("id, created_at"),
      service.from("fcs_resumes").select("id, template_slug, created_at"),
      service.from("fcs_certificates").select("id, template_slug, orientation, created_at"),
      service.from("fcs_export_events").select("id, document_type, format, created_at"),
      service.from("fcs_support_tickets").select("id, status, category, created_at, resolved_at"),
      service
        .from("fcs_ai_messages")
        .select("id, provider, tokens_used, error_code")
        .eq("role", "assistant"),
    ]);

  const resolvedTickets = (tickets ?? []).filter((t) => t.status === "resolved" || t.status === "closed");
  const resolutionRate =
    tickets && tickets.length > 0 ? Math.round((resolvedTickets.length / tickets.length) * 100) : 0;

  const avgResHours = (() => {
    const diffs = resolvedTickets
      .filter((t) => t.resolved_at && t.created_at)
      .map(
        (t) =>
          (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) /
          (1000 * 60 * 60)
      );
    if (diffs.length === 0) return "—";
    return `${(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1)} hrs`;
  })();

  const totalTokens = (aiLogs ?? []).reduce((a, b) => a + (b.tokens_used || 0), 0);

  // Template breakdown
  const templateCounts = new Map<string, number>();
  [...(resumes ?? []), ...(certs ?? [])].forEach((doc) => {
    templateCounts.set(doc.template_slug, (templateCounts.get(doc.template_slug) || 0) + 1);
  });

  const exportCounts = {
    resumePdf: (exports ?? []).filter((e) => e.document_type === "resume" && e.format === "pdf").length,
    resumePng: (exports ?? []).filter((e) => e.document_type === "resume" && e.format === "png").length,
    certPdf: (exports ?? []).filter((e) => e.document_type === "certificate" && e.format === "pdf").length,
    certPng: (exports ?? []).filter((e) => e.document_type === "certificate" && e.format === "png").length,
  };

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Live database metrics — zero placeholder or simulated numbers.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4">
            <p className="text-[var(--adm-ink-muted)]">User Registrations</p>
            <p className="mt-2 text-2xl font-bold">{(profiles ?? []).length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4">
            <p className="text-[var(--adm-ink-muted)]">Total Exports (PDF / PNG)</p>
            <p className="mt-2 text-2xl font-bold">{(exports ?? []).length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4">
            <p className="text-[var(--adm-ink-muted)]">Support Resolution Rate</p>
            <p className="mt-2 text-2xl font-bold">{resolutionRate}%</p>
            <p className="mt-1 text-[11px] text-[var(--adm-ink-muted)]">Avg time: {avgResHours}</p>
          </div>
          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4">
            <p className="text-[var(--adm-ink-muted)]">AI Total Tokens Consumed</p>
            <p className="mt-2 text-2xl font-bold">{totalTokens.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-[var(--adm-ink-muted)]">
              Across {(aiLogs ?? []).length} API calls
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
            <h2 className="text-sm font-bold">Export Format Breakdown</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: "Resume A4 PDF", count: exportCounts.resumePdf },
                { label: "Resume PNG", count: exportCounts.resumePng },
                { label: "Certificate A4 PDF", count: exportCounts.certPdf },
                { label: "Certificate PNG", count: exportCounts.certPng },
              ].map((item) => {
                const max = Math.max(
                  1,
                  exportCounts.resumePdf,
                  exportCounts.resumePng,
                  exportCounts.certPdf,
                  exportCounts.certPng
                );
                return (
                  <div key={item.label}>
                    <div className="flex justify-between font-medium">
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-[var(--adm-surface-muted)]">
                      <div
                        className="h-2 rounded-full bg-teal-600"
                        style={{ width: `${Math.round((item.count / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
            <h2 className="text-sm font-bold">Top Templates Used</h2>
            {templateCounts.size === 0 ? (
              <p className="mt-4 text-[var(--adm-ink-muted)]">No saved documents yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {Array.from(templateCounts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([slug, count]) => (
                    <li
                      key={slug}
                      className="flex items-center justify-between rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-muted)] px-3 py-2"
                    >
                      <span className="font-mono font-semibold">{slug}</span>
                      <span className="font-bold">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
