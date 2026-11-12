import { NextResponse } from "next/server";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    kind?: "testimonial" | "portfolio";
    id?: string;
    is_approved?: boolean;
    is_published?: boolean;
  } | null;

  if (!body?.kind || !body.id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceSupabase();
  if (body.kind === "testimonial") {
    const { data, error } = await service
      .from("fcs_testimonials")
      .update({ is_approved: Boolean(body.is_approved) })
      .eq("id", body.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordAdminAudit({
      actorId: admin.userId,
      action: body.is_approved ? "admin.testimonial.approved" : "admin.testimonial.hidden",
      targetType: "fcs_testimonials",
      targetId: body.id,
    });
    return NextResponse.json({ record: data });
  }

  if (body.kind === "portfolio") {
    const { data, error } = await service
      .from("fcs_portfolios")
      .update({ is_published: Boolean(body.is_published) })
      .eq("id", body.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordAdminAudit({
      actorId: admin.userId,
      action: body.is_published ? "admin.portfolio.published" : "admin.portfolio.unpublished",
      targetType: "fcs_portfolios",
      targetId: body.id,
    });
    return NextResponse.json({ record: data });
  }

  return NextResponse.json({ error: "Unsupported kind" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table");
  const id = searchParams.get("id");

  const allowedTables = new Set([
    "fcs_resumes",
    "fcs_portfolios",
    "fcs_cover_letters",
    "fcs_uploaded_assets",
    "fcs_testimonials",
  ]);
  if (!table || !allowedTables.has(table) || !id) {
    return NextResponse.json({ error: "Invalid delete parameters" }, { status: 400 });
  }

  const service = createServiceSupabase();
  if (table === "fcs_uploaded_assets") {
    const { data: asset } = await service
      .from("fcs_uploaded_assets")
      .select("storage_bucket, storage_path")
      .eq("id", id)
      .maybeSingle();
    if (asset?.storage_bucket && asset?.storage_path) {
      await service.storage.from(asset.storage_bucket).remove([asset.storage_path]);
    }
  }

  const { error } = await service.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAdminAudit({
    actorId: admin.userId,
    action: `admin.${table}.deleted`,
    targetType: table,
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
