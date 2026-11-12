import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TutorialCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug may contain lowercase letters, digits, and hyphens only"),
  episode_number: z.number().int().min(1).max(999),
  category: z.enum([
    "getting_started",
    "studios",
    "ai_career",
    "verification_admin",
  ]),
  section_key: z.string().trim().min(1).max(80),
  section_route: z.string().trim().min(1).max(160),
  title_en: z.string().trim().min(2).max(200),
  title_te: z.string().trim().min(2).max(200),
  description_en: z.string().trim().min(4).max(800),
  description_te: z.string().trim().min(4).max(800),
  duration_seconds: z.number().int().min(10).max(3600).default(70),
  video_url_en: z.string().trim().max(500).nullable().optional(),
  video_url_te: z.string().trim().max(500).nullable().optional(),
  thumbnail_url: z.string().trim().max(500).nullable().optional(),
  subtitle_vtt_en: z.string().trim().max(500).nullable().optional(),
  subtitle_vtt_te: z.string().trim().max(500).nullable().optional(),
  transcript_en: z.string().trim().max(6000).nullable().optional(),
  transcript_te: z.string().trim().max(6000).nullable().optional(),
  is_published: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(100),
});

const TutorialPatchSchema = TutorialCreateSchema.partial();

export async function GET() {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const service = createServiceSupabase();
  const { data, error } = await service
    .from("fcs_tutorials")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("episode_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tutorials: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const raw = await request.json().catch(() => null);
  const parsed = TutorialCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid tutorial payload" },
      { status: 400 }
    );
  }

  const service = createServiceSupabase();
  const { data, error } = await service
    .from("fcs_tutorials")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAdminAudit({
    actorId: admin.userId,
    action: "admin.tutorial.created",
    targetType: "fcs_tutorials",
    targetId: String((data as { id?: string })?.id || ""),
  });

  return NextResponse.json({ tutorial: data });
}

export async function PATCH(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const raw = (await request.json().catch(() => null)) as {
    id?: string;
    patch?: unknown;
    reorder?: Array<{ id: string; sort_order: number }>;
  } | null;

  const service = createServiceSupabase();

  if (Array.isArray(raw?.reorder) && raw.reorder.length > 0) {
    const reorderParsed = z
      .array(z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0).max(9999) }))
      .safeParse(raw.reorder);
    if (!reorderParsed.success) {
      return NextResponse.json({ error: "Invalid reorder payload" }, { status: 400 });
    }
    for (const row of reorderParsed.data) {
      await service
        .from("fcs_tutorials")
        .update({ sort_order: row.sort_order })
        .eq("id", row.id);
    }
    await recordAdminAudit({
      actorId: admin.userId,
      action: "admin.tutorial.reordered",
      targetType: "fcs_tutorials",
      targetId: "batch",
    });
    return NextResponse.json({ ok: true });
  }

  if (!raw?.id || !z.string().uuid().safeParse(raw.id).success) {
    return NextResponse.json({ error: "Valid tutorial UUID is required" }, { status: 400 });
  }

  const parsed = TutorialPatchSchema.safeParse(raw.patch);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  const { data, error } = await service
    .from("fcs_tutorials")
    .update(parsed.data)
    .eq("id", raw.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAdminAudit({
    actorId: admin.userId,
    action: "admin.tutorial.updated",
    targetType: "fcs_tutorials",
    targetId: raw.id,
  });

  return NextResponse.json({ tutorial: data });
}

export async function DELETE(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const raw = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!raw?.id || !z.string().uuid().safeParse(raw.id).success) {
    return NextResponse.json({ error: "Valid tutorial UUID is required" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { error } = await service.from("fcs_tutorials").delete().eq("id", raw.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAdminAudit({
    actorId: admin.userId,
    action: "admin.tutorial.deleted",
    targetType: "fcs_tutorials",
    targetId: raw.id,
  });

  return NextResponse.json({ ok: true });
}
