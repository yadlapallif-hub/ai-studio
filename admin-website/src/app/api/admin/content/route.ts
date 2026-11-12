import { NextResponse } from "next/server";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

type ResourceTable =
  | "fcs_announcements"
  | "fcs_faqs"
  | "fcs_resume_templates"
  | "fcs_certificate_templates"
  | "fcs_template_categories";

const ALLOWED_FIELDS: Record<ResourceTable, ReadonlySet<string>> = {
  fcs_announcements: new Set([
    "title",
    "message",
    "variant",
    "link_label",
    "link_url",
    "is_active",
  ]),
  fcs_faqs: new Set(["question", "answer", "category", "is_published", "sort_order"]),
  fcs_resume_templates: new Set([
    "slug",
    "name",
    "category",
    "description",
    "is_active",
    "config",
    "sort_order",
  ]),
  fcs_certificate_templates: new Set([
    "slug",
    "name",
    "category",
    "description",
    "is_active",
    "config",
    "sort_order",
  ]),
  fcs_template_categories: new Set([
    "slug",
    "name",
    "description",
    "is_active",
    "sort_order",
  ]),
};

function sanitizeFields(table: ResourceTable, input: Record<string, unknown>): Record<string, unknown> {
  const allowed = ALLOWED_FIELDS[table];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

export async function POST(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    table?: ResourceTable;
    record?: Record<string, unknown>;
  } | null;

  if (!body?.table || !(body.table in ALLOWED_FIELDS) || !body.record) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sanitized = sanitizeFields(body.table, body.record);
  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const payload =
    body.table === "fcs_announcements"
      ? { ...sanitized, created_by: admin.userId }
      : sanitized;

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

  if (!body?.table || !(body.table in ALLOWED_FIELDS) || !body.id || !body.patch) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sanitized = sanitizeFields(body.table, body.patch);
  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const keyColumn = body.table === "fcs_template_categories" ? "slug" : "id";
  const { error } = await service.from(body.table).update(sanitized).eq(keyColumn, body.id);
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

  if (!body?.table || !(body.table in ALLOWED_FIELDS) || !body.id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const keyColumn = body.table === "fcs_template_categories" ? "slug" : "id";
  const { error } = await service.from(body.table).delete().eq(keyColumn, body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAdminAudit({
    actorId: admin.userId,
    action: `admin.${body.table}.deleted`,
    targetType: body.table,
    targetId: body.id,
  });

  return NextResponse.json({ ok: true });
}
