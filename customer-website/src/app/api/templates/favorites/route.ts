import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("toggle_favorite"),
    templateSlug: z.string().min(1).max(80),
    templateType: z.enum(["certificate", "resume"]).default("certificate"),
    isFavorite: z.boolean(),
  }),
  z.object({
    action: z.literal("track_use"),
    templateSlug: z.string().min(1).max(80),
    templateType: z.enum(["certificate", "resume"]).default("certificate"),
  }),
  z.object({
    action: z.literal("save_custom_template"),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(300).default("Custom editable certificate template"),
    category: z.string().min(1).max(60).default("corporate"),
    orientation: z.enum(["landscape", "portrait"]).default("landscape"),
    layoutConfig: z.record(z.unknown()),
  }),
]);

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ favorites: [], recent: [], customTemplates: [] });
  }

  const [{ data: prefs }, { data: customTemplates }] = await Promise.all([
    supabase
      .from("fcs_template_favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false })
      .limit(50),
    supabase
      .from("fcs_certificate_templates")
      .select("id, slug, name, category, description, orientation, layout_config, popularity_score, is_custom")
      .eq("created_by", user.id)
      .eq("is_custom", true)
      .order("created_at", { ascending: false }),
  ]);

  const rows = prefs ?? [];
  return NextResponse.json({
    favorites: rows.filter((r) => r.is_favorite).map((r) => r.template_slug),
    recent: rows.map((r) => ({ slug: r.template_slug, lastUsedAt: r.last_used_at, useCount: r.use_count })),
    customTemplates: customTemplates ?? [],
  });
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

  const parsed = ActionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const data = parsed.data;

  if (data.action === "toggle_favorite") {
    const { data: existing } = await service
      .from("fcs_template_favorites")
      .select("id, use_count")
      .eq("user_id", user.id)
      .eq("template_type", data.templateType)
      .eq("template_slug", data.templateSlug)
      .maybeSingle();

    if (existing) {
      await service
        .from("fcs_template_favorites")
        .update({ is_favorite: data.isFavorite })
        .eq("id", existing.id);
    } else {
      await service.from("fcs_template_favorites").insert({
        user_id: user.id,
        template_type: data.templateType,
        template_slug: data.templateSlug,
        is_favorite: data.isFavorite,
        use_count: 1,
      });
    }
    return NextResponse.json({ ok: true, isFavorite: data.isFavorite });
  }

  if (data.action === "track_use") {
    const { data: existing } = await service
      .from("fcs_template_favorites")
      .select("id, use_count")
      .eq("user_id", user.id)
      .eq("template_type", data.templateType)
      .eq("template_slug", data.templateSlug)
      .maybeSingle();

    if (existing) {
      await service
        .from("fcs_template_favorites")
        .update({
          use_count: (existing.use_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await service.from("fcs_template_favorites").insert({
        user_id: user.id,
        template_type: data.templateType,
        template_slug: data.templateSlug,
        is_favorite: false,
        use_count: 1,
      });
    }

    if (data.templateType === "certificate") {
      const { data: tpl } = await service
        .from("fcs_certificate_templates")
        .select("id, popularity_score")
        .eq("slug", data.templateSlug)
        .maybeSingle();
      if (tpl) {
        await service
          .from("fcs_certificate_templates")
          .update({ popularity_score: (tpl.popularity_score ?? 100) + 1 })
          .eq("id", tpl.id);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // save_custom_template
  const baseSlug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "custom";
  const slug = `custom-${baseSlug}-${Date.now().toString(36).slice(-5)}`;

  const { data: inserted, error } = await service
    .from("fcs_certificate_templates")
    .insert({
      slug,
      name: data.name,
      description: data.description,
      category: data.category,
      orientation: data.orientation,
      layout_config: data.layoutConfig,
      is_active: true,
      is_custom: true,
      created_by: user.id,
      sort_order: 500,
      popularity_score: 100,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, template: inserted });
}
