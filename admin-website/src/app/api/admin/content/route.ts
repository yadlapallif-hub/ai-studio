import { NextResponse } from "next/server";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

type ResourceTable =
  | "fcs_announcements"
  | "fcs_faqs"
  | "fcs_resume_templates"
  | "fcs_certificate_templates"
  | "fcs_template_categories";

const ALLOWED_TABLES = new Set<ResourceTable>([
  "fcs_announcements",
  "fcs_faqs",
  "fcs_resume_templates",
  "fcs_certificate_templates",
  "fcs_template_categories",
]);

export async function POST(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    table?: ResourceTable;
    record?: Record<string, unknown>;
  } | null;

  if (!body?.table || !ALLOWED_TABLES.has(body.table) || !body.record) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const payload =
    body.table === "fcs_announcements"
      ? { ...body.record, created_by: admin.userId }
      : body.record;

  const { data, error } = await service.from(body.table).insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAdminAudit({
    actorId: admin.userId,
    action: `admin.${body.table}.created`,
    targetType: body.table,
    targetId: String((data as { id?: string })?.id || ""),
  });

  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    table?: ResourceTable;
    id?: string;
    patch?: Record<string, unknown>;
  } | null;

  if (!body?.table || !ALLOWED_TABLES.has(body.table) || !body.id || !body.patch) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const keyColumn = body.table === "fcs_template_categories" ? "slug" : "id";
  const { error } = await service.from(body.table).update(body.patch).eq(keyColumn, body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAdminAudit({
    actorId: admin.userId,
    action: `admin.${body.table}.updated`,
    targetType: body.table,
    targetId: body.id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    table?: ResourceTable;
    id?: string;
  } | null;

  if (!body?.table || !ALLOWED_TABLES.has(body.table) || !body.id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { error } = await service.from(body.table).delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAdminAudit({
    actorId: admin.userId,
    action: `admin.${body.table}.deleted`,
    targetType: body.table,
    targetId: body.id,
  });

  return NextResponse.json({ ok: true });
}
