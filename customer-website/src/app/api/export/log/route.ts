import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

const ALLOWED_FORMATS = new Set([
  "pdf",
  "png",
  "png_2k",
  "png_4k",
  "jpeg",
  "bulk_zip",
  "svg",
]);

export async function POST(request: NextRequest) {
  let body: {
    documentType?: string;
    documentId?: string;
    format?: string;
    fileName?: string;
    resolutionLabel?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const documentType = body.documentType;
  const documentId = body.documentId;
  const format = body.format || "";

  if (
    (documentType !== "resume" && documentType !== "certificate") ||
    !ALLOWED_FORMATS.has(format) ||
    !documentId
  ) {
    return NextResponse.json({ error: "Invalid export log parameters" }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(documentId)) {
    return NextResponse.json({ ok: true, anonymousDraft: true });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminDb = createServiceSupabase();
  await adminDb.from("fcs_export_events").insert({
    user_id: user?.id ?? null,
    document_type: documentType,
    document_id: documentId,
    format,
    file_name: body.fileName ? String(body.fileName).slice(0, 180) : null,
    resolution_label: body.resolutionLabel ? String(body.resolutionLabel).slice(0, 80) : null,
  });

  if (user) {
    const table = documentType === "resume" ? "fcs_resumes" : "fcs_certificates";
    const { data: existing } = await adminDb
      .from(table)
      .select("download_count")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await adminDb
        .from(table)
        .update({
          download_count: (existing.download_count ?? 0) + 1,
          last_exported_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
