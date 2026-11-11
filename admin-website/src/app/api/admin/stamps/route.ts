import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildOfficialStampSvg,
  stampSvgToDataUrl,
  type OfficialStampConfig,
} from "@francis/shared";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const AdminCreateStampSchema = z.object({
  issuerId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  isDefault: z.boolean().optional(),
  config: z.object({
    preset: z.enum([
      "circular_double",
      "circular_seal",
      "rectangular_official",
      "square_notary",
      "oval_registry",
      "ribbon_badge",
    ]),
    organizationName: z.string().trim().min(1).max(80),
    centerTitle: z.string().trim().min(1).max(32),
    bottomText: z.string().trim().max(50).default(""),
    subCode: z.string().trim().max(40).default(""),
    emblem: z.enum(["shield", "star", "check", "laurel", "crest", "none"]),
    colorFinish: z.enum([
      "blue_ink",
      "red_ink",
      "teal_ink",
      "black_ink",
      "gold_embossed",
      "custom",
    ]),
    customHex: z.string().trim().max(16).optional(),
    fontStyle: z.enum(["serif", "sans", "mono"]),
    borderWeight: z.enum(["thin", "medium", "bold"]),
    distressedInk: z.boolean(),
    showDateLine: z.boolean(),
    dateText: z.string().trim().max(24).default(""),
  }),
});

export async function POST(request: NextRequest) {
  const admin = await getAdminContext([
    "super_admin",
    "admin",
    "content_manager",
    "support_agent",
  ]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = AdminCreateStampSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid stamp payload" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { data: issuer } = await service
    .from("fcs_authorized_issuers")
    .select("id, user_id, organization_name, contact_email, verification_status")
    .eq("id", parsed.data.issuerId)
    .single();

  if (!issuer) {
    return NextResponse.json({ error: "Authorized organization not found" }, { status: 404 });
  }

  if (issuer.verification_status !== "approved") {
    return NextResponse.json(
      { error: "Approve the Authorized Organization before creating official stamps." },
      { status: 400 }
    );
  }

  const stampConfig: OfficialStampConfig = parsed.data.config;
  const built = buildOfficialStampSvg(
    stampConfig,
    `adm-${issuer.id.slice(0, 6)}-${Date.now().toString(36)}`
  );

  const { data: inserted, error } = await service
    .from("fcs_organization_stamps")
    .insert({
      issuer_id: issuer.id,
      created_by: admin.userId,
      name: parsed.data.name,
      stamp_kind: built.stampKind,
      shape: built.shape,
      ink_style: built.inkStyle,
      config: stampConfig,
      svg_markup: built.svgMarkup,
      mime_type: "image/svg+xml",
      is_default: Boolean(parsed.data.isDefault),
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message || "Failed creating organization stamp" },
      { status: 500 }
    );
  }

  await recordAdminAudit({
    actorId: admin.userId,
    action: "admin.organization_stamp.created",
    targetType: "organization_stamp",
    targetId: inserted.id,
    metadata: {
      issuerId: issuer.id,
      organizationName: issuer.organization_name,
      stampName: parsed.data.name,
    },
  });

  return NextResponse.json({
    ok: true,
    stamp: {
      ...inserted,
      preview_url: stampSvgToDataUrl(built.svgMarkup),
    },
  });
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminContext([
    "super_admin",
    "admin",
    "content_manager",
    "support_agent",
  ]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Stamp id is required" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { data: existing } = await service
    .from("fcs_organization_stamps")
    .select("id, issuer_id, name, storage_bucket, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Stamp not found" }, { status: 404 });
  }

  if (existing.storage_bucket && existing.storage_path) {
    await service.storage.from(existing.storage_bucket).remove([existing.storage_path]);
  }

  await service.from("fcs_organization_stamps").delete().eq("id", existing.id);

  await recordAdminAudit({
    actorId: admin.userId,
    action: "admin.organization_stamp.deleted",
    targetType: "organization_stamp",
    targetId: existing.id,
    metadata: { issuerId: existing.issuer_id, stampName: existing.name },
  });

  return NextResponse.json({ ok: true });
}
