import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createWorkspaceNotification, logWorkspaceActivity } from "@/lib/notifications";

const ExportLogSchema = z.object({
  documentType: z.enum(["resume", "certificate"]),
  documentId: z.string().trim().min(1).max(80),
  format: z.enum(["pdf", "png", "png_2k", "png_4k", "jpeg", "bulk_zip", "svg", "docx"]),
  fileName: z.string().trim().max(180).optional(),
  resolutionLabel: z.string().trim().max(80).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`export-log:${ip}`, 40, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many export events" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ExportLogSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid export log parameters" }, { status: 400 });
  }

  const { documentType, documentId, format, fileName, resolutionLabel } = parsed.data;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(documentId)) {
    return NextResponse.json({ ok: true, anonymousDraft: true });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, unauthenticated: true });
  }

  const adminDb = createServiceSupabase();
  const table = documentType === "resume" ? "fcs_resumes" : "fcs_certificates";

  const { data: existing } = await adminDb
    .from(table)
    .select("id, title")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Document not found for current user" }, { status: 403 });
  }

  await adminDb.from("fcs_export_events").insert({
    user_id: user.id,
    document_type: documentType,
    document_id: documentId,
    format,
    file_name: fileName ?? null,
    resolution_label: resolutionLabel ?? null,
  });

  if (documentType === "resume" || documentType === "certificate") {
    const { data: cur } = await adminDb
      .from(table)
      .select("download_count")
      .eq("id", documentId)
      .maybeSingle();
    await adminDb
      .from(table)
      .update({
        download_count: ((cur?.download_count as number | undefined) ?? 0) + 1,
        last_exported_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("user_id", user.id);
  }

  const labelTitle = documentType === "resume" ? "Resume" : "Certificate";
  const link =
    documentType === "resume"
      ? `/resume-builder/${documentId}`
      : `/certificate-builder/${documentId}`;

  await Promise.all([
    createWorkspaceNotification({
      userId: user.id,
      prefKey: "document_exported",
      title: `${labelTitle} Exported (${format.toUpperCase()})`,
      message: `${existing.title || fileName || "Document"} exported cleanly.`,
      link,
    }),
    logWorkspaceActivity({
      actorId: user.id,
      action: `exported_${documentType}_${format}`,
      entityType: documentType,
      entityId: documentId,
      details: { format, fileName: fileName ?? null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
