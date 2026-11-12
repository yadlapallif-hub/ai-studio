import { NextRequest, NextResponse } from "next/server";
import { portfolioSaveSchema } from "@francis/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createWorkspaceNotification, logWorkspaceActivity } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const id = request.nextUrl.searchParams.get("id");
  const slug = request.nextUrl.searchParams.get("slug");

  if (slug) {
    const { data, error } = await supabase
      .from("fcs_portfolios")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }
    return NextResponse.json({ portfolio: data });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (id) {
    const { data, error } = await supabase
      .from("fcs_portfolios")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }
    return NextResponse.json({ portfolio: data });
  }

  const { data, error } = await supabase
    .from("fcs_portfolios")
    .select("id, slug, title, template_id, theme_mode, accent_color, is_published, views_count, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ portfolios: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`portfolios:${ip}`, 30, 60_000);
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
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = portfolioSaveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  if (payload.id) {
    const { data: updated, error } = await supabase
      .from("fcs_portfolios")
      .update({
        slug: payload.slug,
        title: payload.title,
        template_id: payload.template_id,
        theme_mode: payload.theme_mode,
        accent_color: payload.accent_color,
        font_family: payload.font_family,
        is_published: payload.is_published,
        data: payload.data,
      })
      .eq("id", payload.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await Promise.all([
      createWorkspaceNotification({
        userId: user.id,
        prefKey: "project_saved",
        title: payload.is_published ? "Portfolio Published" : "Portfolio Saved",
        message: `"${payload.title}" updated${payload.is_published ? ` cleanly at /p/${payload.slug}` : ""}.`,
        link: payload.is_published ? `/p/${payload.slug}` : `/portfolio-builder?id=${updated.id}`,
      }),
      logWorkspaceActivity({
        actorId: user.id,
        action: payload.is_published ? "published_portfolio" : "saved_portfolio",
        entityType: "portfolio",
        entityId: updated.id,
        details: { title: payload.title, slug: payload.slug },
      }),
    ]);

    return NextResponse.json({ portfolio: updated });
  }

  const { data: inserted, error } = await supabase
    .from("fcs_portfolios")
    .insert({
      user_id: user.id,
      slug: payload.slug,
      title: payload.title,
      template_id: payload.template_id,
      theme_mode: payload.theme_mode,
      accent_color: payload.accent_color,
      font_family: payload.font_family,
      is_published: payload.is_published,
      data: payload.data,
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
      title: payload.is_published ? "Portfolio Published" : "Portfolio Created",
      message: `"${payload.title}" saved to your workspace.`,
      link: payload.is_published ? `/p/${payload.slug}` : `/portfolio-builder?id=${inserted.id}`,
    }),
    logWorkspaceActivity({
      actorId: user.id,
      action: "created_portfolio",
      entityType: "portfolio",
      entityId: inserted.id,
      details: { title: payload.title, slug: payload.slug },
    }),
  ]);

  return NextResponse.json({ portfolio: inserted });
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
    .from("fcs_portfolios")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
