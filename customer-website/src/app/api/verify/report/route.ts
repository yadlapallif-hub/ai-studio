import { NextRequest, NextResponse } from "next/server";
import { certificateReportSchema } from "@francis/shared";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`verify-report:${ip}`, 8, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many reports submitted. Please wait." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = certificateReportSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid report details" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceSupabase();
  const code = parsed.data.certificate_code.trim().toUpperCase();

  const { data: cert } = await service
    .from("fcs_certificates")
    .select("id")
    .ilike("certificate_code", code)
    .maybeSingle();

  const { data: inserted, error } = await service
    .from("fcs_certificate_reports")
    .insert({
      certificate_code: code,
      certificate_id: cert?.id ?? null,
      reporter_user_id: user?.id ?? null,
      reporter_email: parsed.data.reporter_email || user?.email || null,
      reason: parsed.data.reason,
      details: parsed.data.details,
      status: "open",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (cert?.id) {
    await service
      .from("fcs_certificates")
      .update({ is_reported: true, report_reason: parsed.data.reason })
      .eq("id", cert.id);
  }

  const { data: admins } = await service
    .from("fcs_user_roles")
    .select("user_id")
    .in("role", ["super_admin", "admin"]);

  if (admins && admins.length > 0) {
    const adminIds = Array.from(new Set(admins.map((a: { user_id: string }) => a.user_id)));
    await service.from("fcs_notifications").insert(
      adminIds.map((adminId) => ({
        user_id: adminId,
        audience: "admin",
        type: "certificate_verification",
        title: `Reported Certificate: ${code}`,
        message: `Reason: ${parsed.data.reason} — ${parsed.data.details.slice(0, 120)}`,
        link: "/verifications",
        metadata: { report_id: inserted?.id, certificate_code: code },
      }))
    );
  }

  return NextResponse.json({ ok: true, reportId: inserted?.id });
}
