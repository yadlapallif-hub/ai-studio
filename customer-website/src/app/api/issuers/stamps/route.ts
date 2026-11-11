import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildOfficialStampSvg, type OfficialStampConfig } from "@francis/shared";
import {
  getAccessibleIssuersForUser,
  getStampsForApprovedIssuers,
  resolveOrganizationStampRow,
} from "@/lib/issuers";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const StampConfigSchema = z.object({
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
});

const CreateCreatedStampSchema = z.object({
  mode: z.literal("created"),
  issuerId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  isDefault: z.boolean().optional(),
  config: StampConfigSchema,
});

const CreateDataUrlStampSchema = z.object({
  mode: z.literal("data_url"),
  issuerId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  stampKind: z.enum(["stamp", "seal", "signature", "emblem_stamp"]).default("stamp"),
  shape: z.enum(["circle", "rectangle", "square", "scalloped"]).default("circle"),
  inkStyle: z
    .enum([
      "blue_ink",
      "red_ink",
      "teal_ink",
      "black_ink",
      "gold_embossed",
      "custom",
      "default",
    ])
    .default("default"),
  isDefault: z.boolean().optional(),
  dataUrl: z.string().min(30).max(5_000_000),
});

const PatchStampSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(100).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { approvedIssuers } = await getAccessibleIssuersForUser(user);
  const stamps = await getStampsForApprovedIssuers(approvedIssuers);

  return NextResponse.json({
    approvedIssuers,
    stamps,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { approvedIssuers } = await getAccessibleIssuersForUser(user);
  const service = createServiceSupabase();
  const nameMap = new Map(approvedIssuers.map((i) => [i.id, i.organization_name]));

  const contentType = request.headers.get("content-type") || "";

  // Handle multipart FormData upload (custom image file)
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const issuerId = String(form.get("issuerId") || "");
    const stampName = String(form.get("name") || "").trim();
    const stampKind = String(form.get("stampKind") || "stamp") as
      | "stamp"
      | "seal"
      | "signature"
      | "emblem_stamp";
    const shape = String(form.get("shape") || "circle") as
      | "circle"
      | "rectangle"
      | "square"
      | "scalloped";
    const inkStyle = String(form.get("inkStyle") || "default") as
      | "blue_ink"
      | "red_ink"
      | "teal_ink"
      | "black_ink"
      | "gold_embossed"
      | "custom"
      | "default";
    const isDefault = String(form.get("isDefault") || "false") === "true";

    const issuer = approvedIssuers.find((i) => i.id === issuerId);
    if (!issuer) {
      return NextResponse.json(
        { error: "Admin-approved Authorized Organization access is required to create stamps." },
        { status: 403 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Upload a valid PNG, JPG, WEBP, or SVG image under 5 MB." },
        { status: 400 }
      );
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const storagePath = `${user.id}/org-stamps/${issuer.id}/${Date.now()}-${safeFileName}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadErr } = await service.storage
      .from("fcs-vault")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const finalName = stampName || file.name.replace(/\.[^.]+$/, "");
    await service.from("fcs_uploaded_assets").insert({
      user_id: user.id,
      asset_type: stampKind === "seal" || stampKind === "signature" ? stampKind : "stamp",
      file_name: file.name,
      storage_bucket: "fcs-vault",
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      is_sample_decorative: false,
      metadata: { issuer_id: issuer.id, organization_name: issuer.organization_name },
    });

    const { data: inserted, error: insertErr } = await service
      .from("fcs_organization_stamps")
      .insert({
        issuer_id: issuer.id,
        created_by: user.id,
        name: finalName,
        stamp_kind: stampKind,
        shape,
        ink_style: inkStyle,
        config: { source: "upload", fileName: file.name },
        storage_bucket: "fcs-vault",
        storage_path: storagePath,
        mime_type: file.type,
        is_default: isDefault,
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json(
        { error: insertErr?.message || "Failed saving organization stamp." },
        { status: 500 }
      );
    }

    const resolved = await resolveOrganizationStampRow(inserted as never, nameMap);
    return NextResponse.json({ ok: true, stamp: resolved });
  }

  // Handle JSON payloads (created SVG stamp OR dataUrl signature/logo stamp)
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const createdParsed = CreateCreatedStampSchema.safeParse(raw);
  if (createdParsed.success) {
    const payload = createdParsed.data;
    const issuer = approvedIssuers.find((i) => i.id === payload.issuerId);
    if (!issuer) {
      return NextResponse.json(
        { error: "Admin-approved Authorized Organization access is required to create stamps." },
        { status: 403 }
      );
    }

    const stampConfig: OfficialStampConfig = payload.config;
    const built = buildOfficialStampSvg(stampConfig, `org-${issuer.id.slice(0, 6)}-${Date.now().toString(36)}`);

    const { data: inserted, error: insertErr } = await service
      .from("fcs_organization_stamps")
      .insert({
        issuer_id: issuer.id,
        created_by: user.id,
        name: payload.name,
        stamp_kind: built.stampKind,
        shape: built.shape,
        ink_style: built.inkStyle,
        config: stampConfig,
        svg_markup: built.svgMarkup,
        mime_type: "image/svg+xml",
        is_default: Boolean(payload.isDefault),
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json(
        { error: insertErr?.message || "Failed creating organization stamp." },
        { status: 500 }
      );
    }

    await service.from("fcs_activity_logs").insert({
      actor_id: user.id,
      actor_role: "customer",
      action: "organization_stamp_created",
      entity_type: "organization_stamp",
      entity_id: inserted.id,
      details: {
        issuer_id: issuer.id,
        organization_name: issuer.organization_name,
        preset: stampConfig.preset,
        name: payload.name,
      },
    });

    const resolved = await resolveOrganizationStampRow(inserted as never, nameMap);
    return NextResponse.json({ ok: true, stamp: resolved });
  }

  const dataUrlParsed = CreateDataUrlStampSchema.safeParse(raw);
  if (dataUrlParsed.success) {
    const payload = dataUrlParsed.data;
    const issuer = approvedIssuers.find((i) => i.id === payload.issuerId);
    if (!issuer) {
      return NextResponse.json(
        { error: "Admin-approved Authorized Organization access is required to create stamps." },
        { status: 403 }
      );
    }

    const match = payload.dataUrl.match(
      /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/
    );
    if (!match) {
      return NextResponse.json(
        { error: "Supported data URL formats: PNG, JPEG, or WEBP." },
        { status: 400 }
      );
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.byteLength === 0 || buffer.byteLength > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Stamp image must be between 1 byte and 4 MB." },
        { status: 400 }
      );
    }

    const ext = mimeType.split("/")[1] || "png";
    const storagePath = `${user.id}/org-stamps/${issuer.id}/${Date.now()}-${payload.stampKind}.${ext}`;
    const { error: uploadErr } = await service.storage
      .from("fcs-vault")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    await service.from("fcs_uploaded_assets").insert({
      user_id: user.id,
      asset_type: payload.stampKind === "seal" || payload.stampKind === "signature" ? payload.stampKind : "stamp",
      file_name: `${payload.name.replace(/[^a-zA-Z0-9-_]+/g, "_")}.${ext}`,
      storage_bucket: "fcs-vault",
      storage_path: storagePath,
      mime_type: mimeType,
      file_size: buffer.byteLength,
      is_sample_decorative: false,
      metadata: { issuer_id: issuer.id, organization_name: issuer.organization_name },
    });

    const { data: inserted, error: insertErr } = await service
      .from("fcs_organization_stamps")
      .insert({
        issuer_id: issuer.id,
        created_by: user.id,
        name: payload.name,
        stamp_kind: payload.stampKind,
        shape: payload.shape,
        ink_style: payload.inkStyle,
        config: { source: payload.stampKind },
        storage_bucket: "fcs-vault",
        storage_path: storagePath,
        mime_type: mimeType,
        is_default: Boolean(payload.isDefault),
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json(
        { error: insertErr?.message || "Failed saving stamp." },
        { status: 500 }
      );
    }

    const resolved = await resolveOrganizationStampRow(inserted as never, nameMap);
    return NextResponse.json({ ok: true, stamp: resolved });
  }

  return NextResponse.json({ error: "Invalid stamp payload." }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PatchStampSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  const { approvedIssuers } = await getAccessibleIssuersForUser(user);
  const service = createServiceSupabase();

  const { data: existing } = await service
    .from("fcs_organization_stamps")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!existing || !approvedIssuers.some((i) => i.id === existing.issuer_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateFields: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateFields.name = parsed.data.name;
  if (parsed.data.isDefault !== undefined) updateFields.is_default = parsed.data.isDefault;

  const { data: updated, error } = await service
    .from("fcs_organization_stamps")
    .update(updateFields)
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });
  }

  const nameMap = new Map(approvedIssuers.map((i) => [i.id, i.organization_name]));
  const resolved = await resolveOrganizationStampRow(updated as never, nameMap);
  return NextResponse.json({ ok: true, stamp: resolved });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Stamp id is required." }, { status: 400 });
  }

  const { approvedIssuers } = await getAccessibleIssuersForUser(user);
  const service = createServiceSupabase();

  const { data: existing } = await service
    .from("fcs_organization_stamps")
    .select("id, issuer_id, storage_bucket, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!existing || !approvedIssuers.some((i) => i.id === existing.issuer_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.storage_bucket && existing.storage_path) {
    await service.storage.from(existing.storage_bucket).remove([existing.storage_path]);
  }

  await service.from("fcs_organization_stamps").delete().eq("id", existing.id);
  return NextResponse.json({ ok: true });
}
