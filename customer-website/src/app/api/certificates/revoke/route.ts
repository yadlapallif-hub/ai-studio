import { NextRequest, NextResponse } from "next/server";
import { getAccessibleIssuersForUser } from "@/lib/issuers";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { certificateId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.certificateId) {
    return NextResponse.json({ error: "certificateId is required" }, { status: 400 });
  }

  const { data: cert } = await supabase
    .from("fcs_certificates")
    .select("id, certificate_code, issuer_id, user_id")
    .eq("id", body.certificateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cert || !cert.issuer_id) {
    return NextResponse.json(
      { error: "Only officially issued certificates owned by your approved organization can be revoked." },
      { status: 403 }
    );
  }

  const { approvedIssuers } = await getAccessibleIssuersForUser(user);
  if (!approvedIssuers.some((i) => i.id === cert.issuer_id)) {
    return NextResponse.json(
      { error: "Authorized organization approval is required to revoke this certificate." },
      { status: 403 }
    );
  }

  const reason = (body.reason || "Revoked by issuing organization").trim().slice(0, 300);
  const service = createServiceSupabase();
  const nowIso = new Date().toISOString();

  await service
    .from("fcs_certificate_verifications")
    .update({
      verification_status: "revoked",
      revoked_at: nowIso,
      revocation_reason: reason,
    })
    .eq("certificate_id", cert.id);

  await service.from("fcs_activity_logs").insert({
    actor_id: user.id,
    actor_role: "customer",
    action: "certificate_revoked_by_issuer",
    entity_type: "certificate",
    entity_id: cert.id,
    details: { certificate_code: cert.certificate_code, reason },
  });

  return NextResponse.json({ ok: true, verificationStatus: "revoked" });
}
