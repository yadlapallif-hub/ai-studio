import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { TemplatesClient } from "@/components/TemplatesClient";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) redirect("/login");

  const service = createServiceSupabase();
  const [{ data: resumeTemplates }, { data: certTemplates }] = await Promise.all([
    service.from("fcs_resume_templates").select("*").order("sort_order", { ascending: true }),
    service.from("fcs_certificate_templates").select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template Library Management</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Publish or hide public Resume and Certificate templates across Customer Website.
          </p>
        </div>
        <TemplatesClient
          initialResumeTemplates={resumeTemplates ?? []}
          initialCertTemplates={certTemplates ?? []}
        />
      </div>
    </AdminShell>
  );
}
