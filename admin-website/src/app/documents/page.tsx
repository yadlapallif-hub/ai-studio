import React from "react";
import { redirect } from "next/navigation";
import { getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { RestrictedAccessPanel } from "@/components/RestrictedAccessPanel";
import { DocumentsAdminClient } from "@/components/DocumentsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const session = await getSignedInSessionInfo();
  if (!session) redirect("/login");

  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) {
    if (session.hasStaffAccess) {
      return (
        <AdminShell adminName={session.fullName} adminEmail={session.email} roles={session.roles}>
          <RestrictedAccessPanel
            sectionTitle="Document & Testimonial Management"
            allowedHint="Super Admin and Admin roles"
          />
        </AdminShell>
      );
    }
    redirect("/login");
  }

  const service = createServiceSupabase();
  const [{ data: resumes }, { data: portfolios }, { data: coverLetters }, { data: assets }, { data: testimonials }] =
    await Promise.all([
      service
        .from("fcs_resumes")
        .select("id, title, template_slug, target_role, ats_score, download_count, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      service
        .from("fcs_portfolios")
        .select("id, title, slug, template_slug, is_published, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      service
        .from("fcs_cover_letters")
        .select("id, title, company_name, target_role, writing_style, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      service
        .from("fcs_uploaded_assets")
        .select("id, file_name, asset_type, file_size, created_at")
        .order("created_at", { ascending: false })
        .limit(60),
      service
        .from("fcs_testimonials")
        .select("id, author_name, author_role, organization, quote, rating, is_approved, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const customerSiteUrl =
    process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL || "https://francis-creator-studio.vercel.app";

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document &amp; Community Moderation</h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Manage resumes, published portfolios, cover letters, Document Vault uploads, and approve
            authentic customer testimonials.
          </p>
        </div>
        <DocumentsAdminClient
          initialResumes={(resumes ?? []) as never[]}
          initialPortfolios={(portfolios ?? []) as never[]}
          initialCoverLetters={(coverLetters ?? []) as never[]}
          initialAssets={(assets ?? []) as never[]}
          initialTestimonials={(testimonials ?? []) as never[]}
          customerSiteUrl={customerSiteUrl}
        />
      </div>
    </AdminShell>
  );
}
