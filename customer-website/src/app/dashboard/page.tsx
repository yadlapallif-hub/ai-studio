import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { stampSvgToDataUrl } from "@francis/shared";
import { getAccessibleIssuersForUser, getStampsForApprovedIssuers } from "@/lib/issuers";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { buildPageMetadata } from "@/lib/seo";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Studio Hub Dashboard",
  description:
    "Manage saved resumes, certificates, Document Vault assets, Authorized Organization status, and Workspace AI Recommendations.",
  path: "/dashboard",
  noIndex: true,
});

export default async function DashboardPage() {
  const { supabase, user, profile } = await getAuthenticatedContext();

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  const [
    { data: resumes },
    { data: certificates },
    { data: projects },
    { data: sampleStamps },
    { data: signatures },
    { data: bulkBatches },
    { data: exportEvents },
    { data: favoriteTemplates },
    { data: recommendations },
    { data: resumeTemplates },
    { data: certTemplates },
    { data: aiConversations },
    { data: tickets },
    { data: vaultAssets },
    { data: activityLogs },
    { data: userNotifications },
    issuerAccess,
  ] = await Promise.all([
    supabase
      .from("fcs_resumes")
      .select("id, title, template_slug, target_role, ats_score, download_count, updated_at, data, style_config")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("fcs_certificates")
      .select("id, title, recipient_name, certificate_code, template_slug, download_count, updated_at, fcs_certificate_verifications(verification_status)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("fcs_design_projects")
      .select("id, title, template_slug, orientation, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("fcs_stamp_library")
      .select("id, name, stamp_category, is_official_verified, svg_markup, config, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("fcs_signature_library")
      .select("id, signatory_name, signatory_designation, style_preset, data_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("fcs_bulk_batches")
      .select("id, batch_name, total_rows, generated_count, is_official_batch, template_slug, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("fcs_export_events")
      .select("id, document_type, format, resolution_label, file_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("fcs_template_favorites")
      .select("id, template_slug, is_favorite, use_count, last_used_at")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false })
      .limit(30),
    supabase
      .from("fcs_ai_recommendations")
      .select("id, category, title, description, rationale, priority, status, feedback, action_payload")
      .eq("user_id", user.id)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("fcs_resume_templates")
      .select("id, slug, name, category")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("fcs_certificate_templates")
      .select("id, slug, name, category")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("fcs_ai_conversations")
      .select("id, title, context_page, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("fcs_support_tickets")
      .select("id, ticket_number, subject, status, priority, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("fcs_uploaded_assets")
      .select("id, file_name, asset_type, mime_type, file_size, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("fcs_activity_logs")
      .select("id, action, entity_type, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("fcs_notifications")
      .select("id, title, message, link, is_read, created_at")
      .eq("user_id", user.id)
      .eq("audience", "customer")
      .order("created_at", { ascending: false })
      .limit(25),
    getAccessibleIssuersForUser(user),
  ]);

  const approvedSimple = issuerAccess.approvedIssuers.map((i) => ({
    id: i.id,
    organization_name: i.organization_name,
  }));
  const officialStamps =
    approvedSimple.length > 0 ? await getStampsForApprovedIssuers(approvedSimple) : [];

  const userName = String(
    (profile as { full_name?: string } | null)?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      user.phone ||
      "Creator"
  );

  return (
    <DashboardClient
      userName={userName}
      aiRecommendationsEnabled={
        (profile as { ai_recommendations_enabled?: boolean } | null)?.ai_recommendations_enabled !==
        false
      }
      initialResumes={(resumes ?? []) as never[]}
      initialCertificates={(certificates ?? []) as never[]}
      initialProjects={(projects ?? []) as never[]}
      initialSampleStamps={((sampleStamps ?? []) as Array<{
        id: string;
        name: string;
        stamp_category: string;
        is_official_verified: boolean;
        svg_markup: string | null;
        config: Record<string, unknown> | null;
        created_at: string;
      }>).map((s) => ({
        id: s.id,
        name: s.name,
        stamp_category: s.stamp_category,
        is_official_verified: s.is_official_verified,
        preview_url: s.svg_markup
          ? stampSvgToDataUrl(s.svg_markup)
          : String((s.config as Record<string, string> | null)?.dataUrl || ""),
        created_at: s.created_at,
      }))}
      initialOfficialStamps={officialStamps.map((s) => ({
        id: s.id,
        name: s.name,
        stamp_kind: s.stamp_kind,
        preview_url: s.preview_url,
      }))}
      initialSignatures={(signatures ?? []) as never[]}
      initialBulkBatches={(bulkBatches ?? []) as never[]}
      initialExportEvents={(exportEvents ?? []) as never[]}
      initialFavorites={(favoriteTemplates ?? []) as never[]}
      initialRecommendations={(recommendations ?? []) as never[]}
      resumeTemplates={resumeTemplates ?? []}
      certTemplates={certTemplates ?? []}
      aiConversations={aiConversations ?? []}
      tickets={tickets ?? []}
      initialVaultAssets={(vaultAssets ?? []) as never[]}
      initialActivityLogs={(activityLogs ?? []) as never[]}
      initialNotifications={(userNotifications ?? []) as never[]}
      orgApplications={issuerAccess.applications as never[]}
    />
  );
}
