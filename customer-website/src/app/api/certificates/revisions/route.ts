import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CreateRevisionSchema = z.object({
  certificateId: z.string().uuid("Valid certificateId UUID required"),
  snapshot: z.record(z.string(), z.unknown()),
  note: z.string().trim().max(180).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const certificateId = request.nextUrl.searchParams.get("certificateId") ?? "";
  if (!z.string().uuid().safeParse(certificateId).success) {
    return NextResponse.json({ error: "Valid certificateId UUID is required" }, { status: 400 });
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateRevisionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid revision payload" },
      { status: 400 }
    );
  }

  if (JSON.stringify(parsed.data.snapshot).length > 200_000) {
    return NextResponse.json({ error: "Revision snapshot exceeds size limit" }, { status: 413 });
  }

  const { data: ownsCert } = await supabase
    .from("fcs_certificates")
    .select("id")
    .eq("id", parsed.data.certificateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownsCert) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceSupabase();
  const { data: latest } = await service
    .from("fcs_certificate_revisions")
    .select("version_number")
    .eq("certificate_id", parsed.data.certificateId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version_number ?? 0) + 1;
  const { data: inserted, error } = await service
    .from("fcs_certificate_revisions")
    .insert({
      certificate_id: parsed.data.certificateId,
      user_id: user.id,
      version_number: nextVersion,
      snapshot: parsed.data.snapshot,
      note: parsed.data.note || `Revision v${nextVersion}`,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, revision: inserted });
}
