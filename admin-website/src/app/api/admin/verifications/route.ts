import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

const VerificationPatchSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("issuer"),
    id: z.string().uuid(),
    verificationStatus: z.enum(["approved", "pending", "rejected", "suspended", "revoked"]),
    notes: z.string().max(1000).optional(),
    contactEmail: z.string().email().optional(),
  }),
  z.object({
    target: z.literal("certificate"),
    id: z.string().uuid(),
    verificationStatus: z.enum(["verified", "pending_approval", "unverified_draft", "revoked"]),
    notes: z.string().max(1000).optional(),
  }),
  z.object({
    target: z.literal("report"),
    id: z.string().uuid(),
    status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
    adminNotes: z.string().max(1000).optional(),
    revokeCertificate: z.boolean().optional(),
  }),
]);

export async function PATCH(request: Request) {
  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = VerificationPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceSupabase();
  const payload = parsed.data;

  if (payload.target === "issuer") {
    const updateFields: Record<string, unknown> = {
      verification_status: payload.verificationStatus,
      approved_by: payload.verificationStatus === "approved" ? admin.userId : null,
      approved_at: payload.verificationStatus === "approved" ? new Date().toISOString() : null,
    };
    if (payload.notes !== undefined) {
      updateFields.notes = payload.notes.trim() || null;
    }
    if (payload.contactEmail) {
      updateFields.contact_email = payload.contactEmail.trim().toLowerCase();
    }

    const { data: issuer, error } = await service
      .from("fcs_authorized_issuers")
      .update(updateFields)
      .eq("id", payload.id)
      .select("id, user_id, organization_name, contact_email, verification_status, notes, approved_at")
      .single();

    if (error || !issuer) {
      return NextResponse.json({ error: error?.message || "Issuer update failed" }, { status: 500 });
    }

    const notifyUserIds = new Set<string>();
    if (issuer.user_id) notifyUserIds.add(issuer.user_id);

    if (issuer.contact_email) {
      const { data: matchedProfile } = await service
        .from("fcs_profiles")
        .select("id")
        .eq("email", issuer.contact_email.toLowerCase())
        .maybeSingle();
      if (matchedProfile?.id) {
        notifyUserIds.add(matchedProfile.id);
        if (!issuer.user_id) {
          await service
            .from("fcs_authorized_issuers")
            .update({ user_id: matchedProfile.id })
            .eq("id", issuer.id);
        }
      }
    }

    if (notifyUserIds.size > 0) {
      await service.from("fcs_notifications").insert(
        Array.from(notifyUserIds).map((uid) => ({
          user_id: uid,
          audience: "customer",
          type: "certificate_verification",
          title:
            payload.verificationStatus === "approved"
              ? `Stamp Studio Unlocked: ${issuer.organization_name}`
              : `Organization Application ${payload.verificationStatus.toUpperCase()}`,
          message:
            payload.verificationStatus === "approved"
              ? `"${issuer.organization_name}" is now Admin-approved! Open Stamp Studio to create official stamps, seals, and signatures, or issue Verified QR certificates.`
              : `Organization "${issuer.organization_name}" status was updated to ${payload.verificationStatus}.${payload.notes ? ` Note: ${payload.notes}` : ""}`,
          link: payload.verificationStatus === "approved" ? "/stamps" : "/verify",
        }))
      );
    }

    await recordAdminAudit({
      actorId: admin.userId,
      action: `admin.issuer.${payload.verificationStatus}`,
      targetType: "authorized_issuer",
      targetId: payload.id,
      metadata: {
        organizationName: issuer.organization_name,
        contactEmail: issuer.contact_email,
        notes: payload.notes ?? null,
      },
    });

    return NextResponse.json({ ok: true, issuer });
  }

  if (payload.target === "report") {
    const { data: reportRow } = await service
      .from("fcs_certificate_reports")
      .select("id, certificate_code, certificate_id")
      .eq("id", payload.id)
      .single();

    if (!reportRow) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await service
      .from("fcs_certificate_reports")
      .update({
        status: payload.status,
        admin_notes: payload.adminNotes?.trim() || null,
        reviewed_by: admin.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id);

    if (payload.revokeCertificate && reportRow.certificate_code) {
      await service
        .from("fcs_certificate_verifications")
        .update({
          verification_status: "revoked",
          revocation_reason: payload.adminNotes?.trim() || "Revoked following reported credential review",
          revoked_by: admin.userId,
          revoked_at: new Date().toISOString(),
        })
        .ilike("certificate_code", reportRow.certificate_code);
    }

    await recordAdminAudit({
      actorId: admin.userId,
      action: `admin.report.${payload.status}`,
      targetType: "certificate_report",
      targetId: payload.id,
      metadata: {
        certificateCode: reportRow.certificate_code,
        revokeCertificate: Boolean(payload.revokeCertificate),
      },
    });

    return NextResponse.json({ ok: true });
  }

  // Certificate verification record update — enforces authorized issuer requirement when verifying
  const { data: verRow } = await service
    .from("fcs_certificate_verifications")
    .select("id, certificate_id, certificate_code, issuer_id")
    .eq("id", payload.id)
    .single();

  if (!verRow) {
    return NextResponse.json({ error: "Verification record not found" }, { status: 404 });
  }

  if (payload.verificationStatus === "verified") {
    if (!verRow.issuer_id) {
      return NextResponse.json(
        {
          error:
            "Cannot mark Verified without an approved Authorized Issuer linked to this credential.",
        },
        { status: 400 }
      );
    }
    const { data: issuerCheck } = await service
      .from("fcs_authorized_issuers")
      .select("verification_status")
      .eq("id", verRow.issuer_id)
      .single();
    if (issuerCheck?.verification_status !== "approved") {
      return NextResponse.json(
        { error: "Linked organization issuer is not yet approved by Admin." },
        { status: 400 }
      );
    }
  }

  await service
    .from("fcs_certificate_verifications")
    .update({
      verification_status: payload.verificationStatus,
      public_notes: payload.notes ?? null,
      approved_by: payload.verificationStatus === "verified" ? admin.userId : null,
      approved_at: payload.verificationStatus === "verified" ? new Date().toISOString() : null,
      revoked_by: payload.verificationStatus === "revoked" ? admin.userId : null,
      revoked_at: payload.verificationStatus === "revoked" ? new Date().toISOString() : null,
    })
    .eq("id", payload.id);

  await recordAdminAudit({
    actorId: admin.userId,
    action: `admin.certificate.${payload.verificationStatus}`,
    targetType: "certificate_verification",
    targetId: payload.id,
    metadata: { certificateCode: verRow.certificate_code },
  });

  return NextResponse.json({ ok: true });
}
