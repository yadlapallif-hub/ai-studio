import { NextRequest, NextResponse } from "next/server";
import {
  analyzeCareerRecommendations,
  analyzeCertificateDesign,
  analyzeResumeQuality,
  generateSmartDashboardRecommendations,
  type CertificateCanvasElement,
  type CertificateStyleConfig,
  type ResumeData,
  type ResumeStyleConfig,
} from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: recs }] = await Promise.all([
    supabase
      .from("fcs_profiles")
      .select("ai_recommendations_enabled, headline")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("fcs_ai_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    enabled: profile?.ai_recommendations_enabled !== false,
    recommendations: recs ?? [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(payload.action ?? "analyze_resume");

  if (action === "analyze_resume") {
    const resume = payload.resume as ResumeData;
    const style = payload.style as Partial<ResumeStyleConfig> | undefined;
    const jobDescription = typeof payload.jobDescription === "string" ? payload.jobDescription : undefined;
    if (!resume || !resume.personalInfo) {
      return NextResponse.json({ error: "Resume data required" }, { status: 400 });
    }
    const report = analyzeResumeQuality(resume, style, jobDescription);
    return NextResponse.json({ report });
  }

  if (action === "analyze_career") {
    const resume = payload.resume as ResumeData;
    const targetRole = typeof payload.targetRole === "string" ? payload.targetRole : undefined;
    if (!resume || !resume.personalInfo) {
      return NextResponse.json({ error: "Resume data required" }, { status: 400 });
    }
    const report = analyzeCareerRecommendations(resume, targetRole);
    return NextResponse.json({ report });
  }

  if (action === "analyze_certificate") {
    const review = analyzeCertificateDesign({
      title: String(payload.title ?? ""),
      recipientName: String(payload.recipientName ?? ""),
      courseName: String(payload.courseName ?? ""),
      organizationName: String(payload.organizationName ?? ""),
      signatoryName: typeof payload.signatoryName === "string" ? payload.signatoryName : undefined,
      elements: (payload.elements as CertificateCanvasElement[]) ?? [],
      style: (payload.style as CertificateStyleConfig) ?? {
        backgroundColor: "#FFFDF7",
        primaryColor: "#0F4C5C",
        accentColor: "#C59B27",
        borderStyle: "double-gold",
        fontDisplay: "Cormorant Garamond",
        fontBody: "Plus Jakarta Sans",
        showQrCode: true,
        showBorder: true,
      },
    });
    return NextResponse.json({ review });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (action === "refresh_dashboard") {
    const [{ data: profile }, { data: resumes }, { data: certificates }] = await Promise.all([
      supabase
        .from("fcs_profiles")
        .select("headline, ai_recommendations_enabled")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("fcs_resumes")
        .select("id, title, template_slug, data")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("fcs_certificates")
        .select("id, title, signatory_name")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    if (profile?.ai_recommendations_enabled === false) {
      return NextResponse.json({ enabled: false, recommendations: [] });
    }

    const generated = generateSmartDashboardRecommendations({
      hasHeadline: Boolean(profile?.headline?.trim()),
      resumes: (resumes ?? []) as Array<{
        id: string;
        title: string;
        template_slug: string;
        data: ResumeData;
      }>,
      certificates: (certificates ?? []) as Array<{
        id: string;
        title: string;
        signatory_name?: string | null;
      }>,
    });

    await supabase
      .from("fcs_ai_recommendations")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (generated.length > 0) {
      await supabase.from("fcs_ai_recommendations").insert(
        generated.map((r) => ({
          user_id: user.id,
          category: r.category,
          target_document_id: r.target_document_id,
          title: r.title,
          description: r.description,
          rationale: r.rationale,
          priority: r.priority,
          action_payload: r.action_payload,
          status: "pending",
        }))
      );
    }

    const { data: latest } = await supabase
      .from("fcs_ai_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ enabled: true, recommendations: latest ?? [] });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    id?: string;
    status?: "pending" | "accepted" | "saved" | "dismissed";
    feedback?: "helpful" | "not_helpful";
    clearHistory?: boolean;
  };

  if (body.clearHistory) {
    await supabase.from("fcs_ai_recommendations").delete().eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Recommendation id required" }, { status: 400 });
  }

  const updateFields: Record<string, unknown> = {};
  if (body.status) updateFields.status = body.status;
  if (body.feedback) updateFields.feedback = body.feedback;

  const { data, error } = await supabase
    .from("fcs_ai_recommendations")
    .update(updateFields)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recommendation: data });
}
