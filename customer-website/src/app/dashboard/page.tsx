import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, user, profile } = await getAuthenticatedContext();

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  const [
    { data: resumes },
    { data: certificates },
    { data: recommendations },
    { data: resumeTemplates },
    { data: certTemplates },
    { data: aiConversations },
    { data: tickets },
  ] = await Promise.all([
    supabase
      .from("fcs_resumes")
      .select("id, title, template_slug, target_role, ats_score, download_count, updated_at, data, style_config")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("fcs_certificates")
      .select("id, title, recipient_name, certificate_code, template_slug, download_count, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(12),
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
      .limit(5),
    supabase
      .from("fcs_support_tickets")
      .select("id, ticket_number, subject, status, priority, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const userName = String(
    (profile as { full_name?: string } | null)?.full_name ||
      user.user_metadata?.full_name ||
      user.email ||
      "Creator"
  );

  return (
    <DashboardClient
      userName={userName}
      aiRecommendationsEnabled={(profile as { ai_recommendations_enabled?: boolean } | null)?.ai_recommendations_enabled !== false}
      initialResumes={(resumes ?? []) as never[]}
      initialCertificates={(certificates ?? []) as never[]}
      initialRecommendations={(recommendations ?? []) as never[]}
      resumeTemplates={resumeTemplates ?? []}
      certTemplates={certTemplates ?? []}
      aiConversations={aiConversations ?? []}
      tickets={tickets ?? []}
    />
  );
}
