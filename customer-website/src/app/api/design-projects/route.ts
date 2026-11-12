import { NextRequest, NextResponse } from "next/server";
import { designProjectSchema } from "@francis/shared";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("fcs_design_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = designProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid design project payload" },
      { status: 400 }
    );
  }

  const p = parsed.data;
  const service = createServiceSupabase();
  const payload = {
    user_id: user.id,
    certificate_id: p.certificate_id ?? null,
    title: p.title,
    template_slug: p.template_slug,
    orientation: p.orientation,
    canvas_width: p.canvas_width,
    canvas_height: p.canvas_height,
    fields_json: p.fields_json,
    canvas_elements: p.canvas_elements,
    style_config: p.style_config,
    status: p.status,
  };

  if (p.id) {
    const { data, error } = await service
      .from("fcs_design_projects")
      .update(payload)
      .eq("id", p.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, project: data });
  }

  const { data, error } = await service
    .from("fcs_design_projects")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, project: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await supabase.from("fcs_design_projects").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
