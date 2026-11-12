import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const versionCreateSchema = z.object({
  assetId: z.string().uuid().optional(),
  resumeId: z.string().uuid().optional(),
  label: z.string().trim().max(120).optional(),
  storageBucket: z.string().max(80).optional(),
  storagePath: z.string().max(300).optional(),
  mimeType: z.string().max(120).optional(),
  fileSize: z.number().int().min(0).optional(),
  snapshot: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const assetId = request.nextUrl.searchParams.get("assetId");
  const resumeId = request.nextUrl.searchParams.get("resumeId");

  let query = supabase
    .from("fcs_document_versions")
    .select("*")
    .eq("user_id", user.id)
    .order("version_number", { ascending: false })
    .limit(30);

  if (assetId) query = query.eq("asset_id", assetId);
  if (resumeId) query = query.eq("resume_id", resumeId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ versions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = versionCreateSchema.safeParse(raw);
  if (!parsed.success || (!parsed.data.assetId && !parsed.data.resumeId)) {
    return NextResponse.json({ error: "assetId or resumeId required" }, { status: 400 });
  }

  const { assetId, resumeId, label, storageBucket, storagePath, mimeType, fileSize, snapshot } =
    parsed.data;

  let countQuery = supabase
    .from("fcs_document_versions")
    .select("version_number")
    .eq("user_id", user.id)
    .order("version_number", { ascending: false })
    .limit(1);

  if (assetId) countQuery = countQuery.eq("asset_id", assetId);
  if (resumeId) countQuery = countQuery.eq("resume_id", resumeId);

  const { data: latest } = await countQuery;
  const nextVersion = ((latest?.[0]?.version_number as number | undefined) ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("fcs_document_versions")
    .insert({
      user_id: user.id,
      asset_id: assetId ?? null,
      resume_id: resumeId ?? null,
      version_number: nextVersion,
      label: label || `Version v${nextVersion}`,
      storage_bucket: storageBucket ?? null,
      storage_path: storagePath ?? null,
      mime_type: mimeType ?? null,
      file_size: fileSize ?? 0,
      snapshot: snapshot ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (assetId && storagePath) {
    await supabase
      .from("fcs_uploaded_assets")
      .update({
        current_version: nextVersion,
        storage_path: storagePath,
        ...(mimeType ? { mime_type: mimeType } : {}),
        ...(fileSize !== undefined ? { file_size: fileSize } : {}),
      })
      .eq("id", assetId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ version: inserted });
}
