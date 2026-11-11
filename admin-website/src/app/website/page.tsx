import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { WebsiteManagementClient } from "@/components/WebsiteManagementClient";
import { RestrictedAccessPanel } from "@/components/RestrictedAccessPanel";

export const dynamic = "force-dynamic";

export default async function AdminWebsitePage() {
  const session = await getSignedInSessionInfo();
  if (!session) redirect("/login");

  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) {
    if (session.hasStaffAccess) {
      return (
        <AdminShell adminName={session.fullName} adminEmail={session.email} roles={session.roles}>
          <RestrictedAccessPanel
            sectionTitle="Website, Announcements & FAQ"
            allowedHint="Super Admin, Admin, and Content Manager roles"
          />
        </AdminShell>
      );
    }
    redirect("/login");
  }

  const service = createServiceSupabase();
  const [{ data: settings }, { data: announcements }, { data: faqs }] = await Promise.all([
    service
      .from("fcs_platform_settings")
      .select("key, value")
      .in("key", ["branding", "website_content", "footer_content"]),
    service.from("fcs_announcements").select("*").order("created_at", { ascending: false }),
    service.from("fcs_faqs").select("*").order("sort_order", { ascending: true }),
  ]);

  const map = new Map((settings ?? []).map((s) => [s.key, s.value as Record<string, string>]));

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Website, Announcements & FAQ</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Changes save directly to PostgreSQL and appear immediately on the Customer Website.
          </p>
        </div>
        <WebsiteManagementClient
          initialBranding={map.get("branding") || {}}
          initialWebsiteContent={map.get("website_content") || {}}
          initialFooter={map.get("footer_content") || {}}
          initialAnnouncements={announcements ?? []}
          initialFaqs={faqs ?? []}
        />
      </div>
    </AdminShell>
  );
}
