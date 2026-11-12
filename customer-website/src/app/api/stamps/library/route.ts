import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildSampleStampSvg, stampSvgToDataUrl, type OfficialStampConfig } from "@francis/shared";
import { getAccessibleIssuersForUser } from "@/lib/issuers";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SampleStampCreateSchema = z.object({
  kind: z.literal("stamp"),
  name: z.string().trim().min(2).max(100),
  stampCategory: z
    .enum(["company", "organization", "academic_sample", "digital_seal", "custom", "sample"])
    .default("sample"),
  issuerId: z.string().uuid().nullable().optional(),
  dataUrl: z.string().max(4_000_000).optional(),
  config: z
    .object({
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
      curvature: z.number().min(0.65).max(1.25).optional(),
      textRotation: z.number().min(-180).max(180).optional(),
      opacity: z.number().min(0.15).max(1).optional(),
      scale: z.number().min(0.5).max(1.6).optional(),
      registrationNumber: z.string().trim().max(32).optional(),
    })
    .optional(),
});

const SignatureCreateSchema = z.object({
  kind: z.literal("signature"),
  signatoryName: z.string().trim().min(2, "Signatory name is required").max(120),
  signatoryDesignation: z.string().trim().max(120).default("Authorized Signatory"),
  stylePreset: z.string().trim().max(40).default("hand_drawn"),
  issuerId: z.string().uuid().nullable().optional(),
  dataUrl: z.string().min(30).max(4_000_000),
});

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceSupabase();
  const [{ data: stamps }, { data: signatures }] = await Promise.all([
    service
      .from("fcs_stamp_library")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
    service
      .from("fcs_signature_library")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const resolvedStamps = (stamps ?? []).map((row) => ({
    ...row,
    preview_url: row.svg_markup
      ? stampSvgToDataUrl(row.svg_markup)
      : ((row.config as Record<string, string>)?.dataUrl || ""),
  }));

  return NextResponse.json({
    stamps: resolvedStamps,
    signatures: signatures ?? [],
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { approvedIssuers } = await getAccessibleIssuersForUser(user);

  const stampParsed = SampleStampCreateSchema.safeParse(body);
  if (stampParsed.success) {
    const p = stampParsed.data;
    const verifiedIssuer =
      p.issuerId && approvedIssuers.find((i) => i.id === p.issuerId) ? p.issuerId : null;
    // Sample Stamp Studio always stores sample/personal stamps unless tied explicitly to an approved org
    const isOfficial = false;

    if (p.config) {
      const cfg: OfficialStampConfig = {
        ...p.config,
        stampCategory: p.stampCategory,
      };
      const built = buildSampleStampSvg(cfg, `sample-${user.id.slice(0, 6)}-${Date.now().toString(36)}`);
      const { data: inserted, error } = await service
        .from("fcs_stamp_library")
        .insert({
          user_id: user.id,
          issuer_id: verifiedIssuer,
          name: p.name,
          stamp_category: p.stampCategory,
          is_official_verified: isOfficial,
          shape: built.shape,
          ink_color: p.config.customHex || "#1D4ED8",
          opacity: Number(p.config.opacity ?? 0.95),
          rotation: Math.round(Number(p.config.textRotation ?? 0)),
          curvature: Number(p.config.curvature ?? 1),
          scale: Number(p.config.scale ?? 1),
          config: cfg,
          svg_markup: built.svgMarkup,
          mime_type: "image/svg+xml",
        })
        .select("*")
        .single();

      if (error || !inserted) {
        return NextResponse.json({ error: error?.message || "Failed saving stamp" }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        stamp: { ...inserted, preview_url: built.dataUrl },
      });
    }

    if (p.dataUrl && p.dataUrl.startsWith("data:image/")) {
      const { data: inserted, error } = await service
        .from("fcs_stamp_library")
        .insert({
          user_id: user.id,
          issuer_id: verifiedIssuer,
          name: p.name,
          stamp_category: p.stampCategory,
          is_official_verified: false,
          shape: "circle",
          ink_color: "#1D4ED8",
          config: { source: "upload", dataUrl: p.dataUrl },
          mime_type: "image/png",
        })
        .select("*")
        .single();

      if (error || !inserted) {
        return NextResponse.json({ error: error?.message || "Failed saving uploaded stamp" }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        stamp: { ...inserted, preview_url: p.dataUrl },
      });
    }

    return NextResponse.json({ error: "Provide stamp configuration or image dataUrl." }, { status: 400 });
  }

  const sigParsed = SignatureCreateSchema.safeParse(body);
  if (sigParsed.success) {
    const p = sigParsed.data;
    if (!p.dataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Signature must be a valid PNG/WEBP/SVG data URL." }, { status: 400 });
    }
    const verifiedIssuer =
      p.issuerId && approvedIssuers.find((i) => i.id === p.issuerId) ? p.issuerId : null;

    const { data: inserted, error } = await service
      .from("fcs_signature_library")
      .insert({
        user_id: user.id,
        issuer_id: verifiedIssuer,
        signatory_name: p.signatoryName,
        signatory_designation: p.signatoryDesignation || "Authorized Signatory",
        style_preset: p.stylePreset,
        is_authorized_signatory: Boolean(verifiedIssuer),
        data_url: p.dataUrl,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      return NextResponse.json({ error: error?.message || "Failed saving signature" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, signature: inserted });
  }

  return NextResponse.json({ error: "Invalid stamp/signature payload" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kind = request.nextUrl.searchParams.get("kind") || "stamp";
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const table = kind === "signature" ? "fcs_signature_library" : "fcs_stamp_library";
  const service = createServiceSupabase();
  await service.from(table).delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
