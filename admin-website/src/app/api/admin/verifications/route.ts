import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, recordAdminAudit } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";

const VerificationPatchSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("issuer"),
    id: z.string().uuid(),
    verificationStatus: z.enum(["approved", "pending", "revoked", "rejected"]),
    notes: z.string().max(1000).optional(),
  }),
  z.object({
    target: z.literal("certificate"),
    id: z.string().uuid(),
    verificationStatus: z.enum(["verified", "pending_approval", "unverified_draft", "revoked"]),
    notes: z.string().max(1000).optional(),
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
    const { data: issuer, error } = await service
      .from("fcs_authorized_issuers")
      .update({
        verification_status: payload.verificationStatus,
        notes: payload.notes ?? null,
        approved_by: payload.verificationStatus === "approved" ? admin.userId : null,
        approved_at: payload.verificationStatus === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", payload.id)
      .select("user_id, organization_name")
      .single();

    if (error || !issuer) {
      return NextResponse.json({ error: error?.message || "Issuer update failed" }, { status: 500 });
    }

    if (issuer.user_id) {
      await service.from("fcs_notifications").insert({
        user_id: issuer.user_id,
        audience: "customer",
        type: "certificate_verification",
        title: `Authorized Issuer ${payload.verificationStatus.toUpperCase()}`,
        message: `Organization "${issuer.organization_name}" status is now ${payload.verificationStatus}.`,
        link: "/verify",
      });
    }

    await recordAdminAudit({
      actorId: admin.userId,
      action: `admin.issuer.${payload.verificationStatus}`,
      targetType: "authorized_issuer",
      targetId: payload.id,
      metadata: { organizationName: issuer.organization_name },
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
        { error: "Linked organization issuer is not yet approved." },
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
