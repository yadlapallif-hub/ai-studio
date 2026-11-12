import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateCertificateCode } from "@francis/shared";
import { getAccessibleIssuersForUser } from "@/lib/issuers";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

const BulkRowSchema = z.object({
  recipientName: z.string().trim().min(1).max(160),
  courseOrAchievement: z.string().trim().min(1).max(220),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  organizationName: z.string().trim().min(1).max(180),
  certificateTitle: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional().default(""),
  signatoryName: z.string().max(140).optional().default(""),
  signatoryDesignation: z.string().max(140).optional().default(""),
  certificateCode: z.string().trim().max(64).optional().default(""),
});

const BulkRequestSchema = z.object({
  batchName: z.string().trim().min(1).max(160),
  sourceFilename: z.string().max(160).optional(),
  templateSlug: z.string().min(1).max(80),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  canvasWidth: z.number().int().min(400).max(2400).default(1123),
  canvasHeight: z.number().int().min(400).max(2400).default(794),
  issuerId: z.string().uuid().nullable().optional(),
  issueOfficial: z.boolean().optional().default(false),
  columnMapping: z.record(z.string()).optional().default({}),
  canvasElements: z.array(z.record(z.unknown())).optional().default([]),
  styleConfig: z.record(z.unknown()).optional().default({}),
  rows: z.array(BulkRowSchema).min(1).max(250),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save bulk batches." }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = BulkRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid bulk payload" },
      { status: 400 }
    );
  }

  const p = parsed.data;
  const { approvedIssuers } = await getAccessibleIssuersForUser(user);
  const approvedIssuer =
    p.issueOfficial && p.issuerId ? approvedIssuers.find((i) => i.id === p.issuerId) : null;
  const isOfficial = Boolean(approvedIssuer);

  const service = createServiceSupabase();

  const { data: batch, error: batchErr } = await service
    .from("fcs_bulk_batches")
    .insert({
      user_id: user.id,
      issuer_id: approvedIssuer?.id ?? null,
      batch_name: p.batchName,
      source_filename: p.sourceFilename || null,
      template_slug: p.templateSlug,
      total_rows: p.rows.length,
      valid_rows: p.rows.length,
      generated_count: p.rows.length,
      is_official_batch: isOfficial,
      column_mapping: p.columnMapping,
      summary: {
        official: isOfficial,
        organizationName: approvedIssuer?.organization_name || "Sample / Draft Batch",
      },
    })
    .select("*")
    .single();

  if (batchErr || !batch) {
    return NextResponse.json({ error: batchErr?.message || "Failed creating batch" }, { status: 500 });
  }

  const safeElements = isOfficial
    ? p.canvasElements
    : p.canvasElements.map((el) => ({
        ...el,
        isSampleDecorative: el.type === "stamp" || el.type === "seal" ? true : el.isSampleDecorative,
      }));

  const certRows = p.rows.map((r) => ({
    user_id: user.id,
    issuer_id: approvedIssuer?.id ?? null,
    template_slug: p.templateSlug,
    certificate_code: r.certificateCode || generateCertificateCode(),
    title: r.certificateTitle,
    recipient_name: r.recipientName,
    course_or_achievement: r.courseOrAchievement,
    organization_name: approvedIssuer?.organization_name || r.organizationName,
    description: r.description || null,
    issue_date: r.issueDate,
    expiry_date: r.expiryDate || null,
    signatory_name: r.signatoryName || null,
    signatory_designation: r.signatoryDesignation || null,
    orientation: p.orientation,
    canvas_width: p.canvasWidth,
    canvas_height: p.canvasHeight,
    is_sample: !isOfficial,
    bulk_batch_id: batch.id,
    canvas_elements: safeElements,
    style_config: p.styleConfig,
    authorization_type: isOfficial ? "authorized_issuer" : "sample_preview",
  }));

  const { data: createdCerts, error: certsErr } = await service
    .from("fcs_certificates")
    .insert(certRows)
    .select("id, certificate_code, recipient_name, title, course_or_achievement, organization_name, issue_date, expiry_date");

  if (certsErr || !createdCerts) {
    return NextResponse.json(
      { error: certsErr?.message || "Failed saving bulk certificates" },
      { status: 500 }
    );
  }

  if (isOfficial && approvedIssuer) {
    const nowIso = new Date().toISOString();
    const verRows = createdCerts.map((c) => ({
      certificate_id: c.id,
      certificate_code: c.certificate_code,
      issuer_id: approvedIssuer.id,
      recipient_name: c.recipient_name,
      certificate_title: c.title,
      course_or_achievement: c.course_or_achievement,
      issuing_organization: c.organization_name,
      issue_date: c.issue_date,
      expiry_date: c.expiry_date,
      verification_status: "verified",
      approved_by: user.id,
      approved_at: nowIso,
    }));
    await service.from("fcs_certificate_verifications").insert(verRows);
  }

  await service.from("fcs_activity_logs").insert({
    actor_id: user.id,
    actor_role: "customer",
    action: "bulk_certificates_generated",
    entity_type: "bulk_batch",
    entity_id: batch.id,
    details: {
      count: createdCerts.length,
      official: isOfficial,
      template_slug: p.templateSlug,
    },
  });

  return NextResponse.json({
    ok: true,
    batch,
    isOfficial,
    certificates: createdCerts,
  });
}
