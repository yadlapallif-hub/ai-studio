import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,().%*_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`search:${ip}`, 45, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const clean = sanitizeSearchTerm(request.nextUrl.searchParams.get("q") ?? "");
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pattern = clean ? `%${clean}%` : "%";

  const [{ data: resumeTemplates }, { data: certTemplates }, { data: faqs }] = await Promise.all([
    supabase
      .from("fcs_resume_templates")
      .select("id, slug, name, category")
      .eq("is_active", true)
      .ilike("name", pattern)
      .limit(5),
    supabase
      .from("fcs_certificate_templates")
      .select("id, slug, name, category")
      .eq("is_active", true)
      .ilike("name", pattern)
      .limit(5),
    supabase
      .from("fcs_faqs")
      .select("id, question, category")
      .eq("is_published", true)
      .ilike("question", pattern)
      .limit(4),
  ]);

  let resumes: Array<{ id: string; title: string; template_slug: string }> = [];
  let certificates: Array<{
    id: string;
    title: string;
    recipient_name: string;
    certificate_code: string;
  }> = [];
  let projects: Array<{ id: string; title: string; template_slug: string; status: string }> = [];
  let assets: Array<{ id: string; file_name: string; asset_type: string }> = [];
  let conversations: Array<{ id: string; title: string; context_page: string }> = [];
  let activities: Array<{ id: string; action: string; entity_type: string; created_at: string }> =
    [];

  if (user) {
    const [rRes, cRes, pRes, aRes, convRes, actRes] = await Promise.all([
      supabase
        .from("fcs_resumes")
        .select("id, title, template_slug")
        .eq("user_id", user.id)
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("fcs_certificates")
        .select("id, title, recipient_name, certificate_code")
        .eq("user_id", user.id)
        .or(`title.ilike.${pattern},recipient_name.ilike.${pattern},certificate_code.ilike.${pattern}`)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("fcs_design_projects")
        .select("id, title, template_slug, status")
        .eq("user_id", user.id)
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase
        .from("fcs_uploaded_assets")
        .select("id, file_name, asset_type")
        .eq("user_id", user.id)
        .ilike("file_name", pattern)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("fcs_ai_conversations")
        .select("id, title, context_page")
        .eq("user_id", user.id)
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase
        .from("fcs_activity_logs")
        .select("id, action, entity_type, created_at")
        .eq("actor_id", user.id)
        .ilike("action", pattern)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    resumes = rRes.data ?? [];
    certificates = cRes.data ?? [];
    projects = pRes.data ?? [];
    assets = aRes.data ?? [];
    conversations = convRes.data ?? [];
    activities = actRes.data ?? [];
  }

  return NextResponse.json({
    resumes,
    certificates,
    projects,
    assets,
    conversations,
    activities,
    resumeTemplates: resumeTemplates ?? [],
    certificateTemplates: certTemplates ?? [],
    faqs: faqs ?? [],
  });
}
