import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pattern = q ? `%${q}%` : "%";

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
  let assets: Array<{ id: string; file_name: string; asset_type: string }> = [];

  if (user) {
    const [rRes, cRes, aRes] = await Promise.all([
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
        .from("fcs_uploaded_assets")
        .select("id, file_name, asset_type")
        .eq("user_id", user.id)
        .ilike("file_name", pattern)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    resumes = rRes.data ?? [];
    certificates = cRes.data ?? [];
    assets = aRes.data ?? [];
  }

  return NextResponse.json({
    resumes,
    certificates,
    assets,
    resumeTemplates: resumeTemplates ?? [],
    certificateTemplates: certTemplates ?? [],
    faqs: faqs ?? [],
  });
}
