import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const certificateId = request.nextUrl.searchParams.get("certificateId");
  if (!certificateId) {
    return NextResponse.json({ error: "certificateId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fcs_certificate_revisions")
    .select("*")
    .eq("certificate_id", certificateId)
    .eq("user_id", user.id)
    .order("version_number", { ascending: false })
    .limit(25);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revisions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { certificateId?: string; snapshot?: Record<string, unknown>; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.certificateId || !body.snapshot) {
    return NextResponse.json({ error: "certificateId and snapshot required" }, { status: 400 });
  }

  const { data: ownsCert } = await supabase
    .from("fcs_certificates")
    .select("id")
    .eq("id", body.certificateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownsCert) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceSupabase();
  const { data: latest } = await service
    .from("fcs_certificate_revisions")
    .select("version_number")
    .eq("certificate_id", body.certificateId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version_number ?? 0) + 1;
  const { data: inserted, error } = await service
    .from("fcs_certificate_revisions")
    .insert({
      certificate_id: body.certificateId,
      user_id: user.id,
      version_number: nextVersion,
      snapshot: body.snapshot,
      note: body.note || `Revision v${nextVersion}`,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, revision: inserted });
}
