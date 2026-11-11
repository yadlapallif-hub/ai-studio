import { NextRequest, NextResponse } from "next/server";
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

  const adminDb = createServiceSupabase();
  let status: "pending_approval" | "verified" = "pending_approval";
  let approvedIssuerId: string | null = null;

  // Auto-verify when linked to an approved Authorized Issuer owned by user, matching user's email, or registered openly
  if (body.issuerId) {
    const { data: issuer } = await adminDb
      .from("fcs_authorized_issuers")
      .select("id, user_id, contact_email, verification_status")
      .eq("id", body.issuerId)
      .eq("verification_status", "approved")
      .maybeSingle();

    const canUseIssuer =
      issuer &&
      (issuer.user_id === user.id ||
        issuer.user_id === null ||
        (user.email && issuer.contact_email.toLowerCase() === user.email.toLowerCase()));

    if (canUseIssuer) {
      status = "verified";
      approvedIssuerId = issuer.id;
    }
  }

  await adminDb
    .from("fcs_certificate_verifications")
    .upsert(
      {
        certificate_id: cert.id,
        certificate_code: cert.certificate_code,
        issuer_id: approvedIssuerId ?? cert.issuer_id ?? null,
        recipient_name: cert.recipient_name,
        certificate_title: cert.title,
        course_or_achievement: cert.course_or_achievement,
        issuing_organization: cert.organization_name,
        issue_date: cert.issue_date,
        expiry_date: cert.expiry_date,
        verification_status: status,
        approved_by: status === "verified" ? user.id : null,
        approved_at: status === "verified" ? new Date().toISOString() : null,
      },
      { onConflict: "certificate_id" }
    );

  if (status === "pending_approval") {
    // Notify admins of verification request
    const { data: admins } = await adminDb
      .from("fcs_user_roles")
      .select("user_id")
      .in("role", ["super_admin", "admin"]);

    if (admins && admins.length > 0) {
      await adminDb.from("fcs_notifications").insert(
        admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          audience: "admin",
          type: "certificate_verification",
          title: `Verification requested: ${cert.certificate_code}`,
          message: `${cert.organization_name} submitted "${cert.title}" for review.`,
          link: "/certificates",
          metadata: { certificate_code: cert.certificate_code, certificate_id: cert.id },
        }))
      );
    }
  }

  return NextResponse.json({
    ok: true,
    verificationStatus: status,
    certificateCode: cert.certificate_code,
  });
}
