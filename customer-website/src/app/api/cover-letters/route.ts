import { NextRequest, NextResponse } from "next/server";
import { coverLetterSaveSchema } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createWorkspaceNotification, logWorkspaceActivity } from "@/lib/notifications";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("fcs_cover_letters")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ coverLetters: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`cover-letters:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = coverLetterSaveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  if (payload.id) {
    const { data: updated, error } = await supabase
      .from("fcs_cover_letters")
      .update({
        resume_id: payload.resume_id ?? null,
        title: payload.title,
        company_name: payload.company_name,
        target_role: payload.target_role,
        hiring_manager: payload.hiring_manager ?? null,
        writing_style: payload.writing_style,
        job_description: payload.job_description ?? null,
        content: payload.content,
        recommendations: payload.recommendations,
      })
      .eq("id", payload.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await createWorkspaceNotification({
      userId: user.id,
      prefKey: "project_saved",
      title: "Cover Letter Updated",
      message: `"${payload.title}" saved in your Cover Letter Studio.`,
      link: `/cover-letter?id=${updated.id}`,
    });

    return NextResponse.json({ coverLetter: updated });
  }

  const { data: inserted, error } = await supabase
    .from("fcs_cover_letters")
    .insert({
      user_id: user.id,
      resume_id: payload.resume_id ?? null,
      title: payload.title,
      company_name: payload.company_name,
      target_role: payload.target_role,
      hiring_manager: payload.hiring_manager ?? null,
      writing_style: payload.writing_style,
      job_description: payload.job_description ?? null,
      content: payload.content,
      recommendations: payload.recommendations,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await Promise.all([
    createWorkspaceNotification({
      userId: user.id,
      prefKey: "project_saved",
      title: "Cover Letter Saved",
      message: `"${payload.title}" saved to your workspace.`,
      link: `/cover-letter?id=${inserted.id}`,
    }),
    logWorkspaceActivity({
      actorId: user.id,
      action: "saved_cover_letter",
      entityType: "cover_letter",
      entityId: inserted.id,
      details: { title: payload.title, company: payload.company_name },
    }),
  ]);

  return NextResponse.json({ coverLetter: inserted });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("fcs_cover_letters")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
