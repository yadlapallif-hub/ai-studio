import { NextRequest, NextResponse } from "next/server";
import { getAccessibleIssuersForUser } from "@/lib/issuers";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { certificateId?: string; issuerId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.certificateId) {
    return NextResponse.json({ error: "certificateId is required" }, { status: 400 });
  }

  const { data: cert, error } = await supabase
    .from("fcs_certificates")
    .select("*")
    .eq("id", body.certificateId)
    .eq("user_id", user.id)
    .single();

  if (error || !cert) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const targetIssuerId = body.issuerId || cert.issuer_id || null;
  if (!targetIssuerId) {
    return NextResponse.json(
      {
        error:
          "An Admin-approved Authorized Organization is required to issue Verified credentials. Apply or check approval status at /verify.",
      },
      { status: 403 }
    );
  }

  const { applications } = await getAccessibleIssuersForUser(user);
  const issuer = applications.find((item) => item.id === targetIssuerId);

  if (!issuer) {
    return NextResponse.json(
      { error: "You do not have permission to issue credentials for that organization." },
      { status: 403 }
    );
  }

  if (issuer.verification_status !== "approved") {
    return NextResponse.json(
      {
        error: `Organization "${issuer.organization_name}" is currently "${issuer.verification_status}". Administrator approval is required before issuing Verified credentials.`,
      },
      { status: 403 }
    );
  }

  const adminDb = createServiceSupabase();
  const nowIso = new Date().toISOString();

  await adminDb
    .from("fcs_certificates")
    .update({
      issuer_id: issuer.id,
      authorization_type: "authorized_issuer",
    })
    .eq("id", cert.id)
    .eq("user_id", user.id);

  await adminDb
    .from("fcs_certificate_verifications")
    .upsert(
      {
        certificate_id: cert.id,
        certificate_code: cert.certificate_code,
        issuer_id: issuer.id,
        recipient_name: cert.recipient_name,
        certificate_title: cert.title,
        course_or_achievement: cert.course_or_achievement,
        issuing_organization: cert.organization_name || issuer.organization_name,
        issue_date: cert.issue_date,
        expiry_date: cert.expiry_date,
        verification_status: "verified",
        approved_by: user.id,
        approved_at: nowIso,
      },
      { onConflict: "certificate_id" }
    );

  await adminDb.from("fcs_activity_logs").insert({
    actor_id: user.id,
    actor_role: "customer",
    action: "certificate_verified_by_issuer",
    entity_type: "certificate",
    entity_id: cert.id,
    details: {
      certificate_code: cert.certificate_code,
      issuer_id: issuer.id,
      organization_name: issuer.organization_name,
    },
  });

  return NextResponse.json({
    ok: true,
    verificationStatus: "verified",
    certificateCode: cert.certificate_code,
  });
}
