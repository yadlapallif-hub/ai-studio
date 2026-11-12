import React from "react";
import { redirect } from "next/navigation";
import { stampSvgToDataUrl } from "@francis/shared";
import { getAdminContext, getSignedInSessionInfo } from "@/lib/admin-auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";
import { VerificationsClient } from "@/components/VerificationsClient";
import { RestrictedAccessPanel } from "@/components/RestrictedAccessPanel";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const session = await getSignedInSessionInfo();
  if (!session) redirect("/login");

  const admin = await getAdminContext(["super_admin", "admin", "content_manager"]);
  if (!admin) {
    if (session.hasStaffAccess) {
      return (
        <AdminShell adminName={session.fullName} adminEmail={session.email} roles={session.roles}>
          <RestrictedAccessPanel
            sectionTitle="Verifications & Issuers"
            allowedHint="Super Admin, Admin, and Content Manager roles"
          />
        </AdminShell>
      );
    }
    redirect("/login");
  }

  const service = createServiceSupabase();
  const [{ data: issuers }, { data: certs }, { data: rawStamps }, { data: reports }] =
    await Promise.all([
      service
        .from("fcs_authorized_issuers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      service
        .from("fcs_certificate_verifications")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100),
      service
        .from("fcs_organization_stamps")
        .select("id, issuer_id, name, stamp_kind, shape, ink_style, svg_markup, is_default, created_at")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      service
        .from("fcs_certificate_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  const userIds = Array.from(
    new Set(
      (issuers ?? [])
        .map((iss) => iss.user_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  );

  const profileEmailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("fcs_profiles")
      .select("id, email")
      .in("id", userIds);
    for (const prof of profiles ?? []) {
      if (prof.email) profileEmailMap.set(prof.id, prof.email);
    }
  }

  const enrichedIssuers = (issuers ?? []).map((iss) => ({
    ...iss,
    requester_email: iss.user_id ? profileEmailMap.get(iss.user_id) ?? null : null,
  }));

  const stamps = (rawStamps ?? []).map((st) => ({
    id: st.id as string,
    issuer_id: st.issuer_id as string,
    name: st.name as string,
    stamp_kind: st.stamp_kind as string,
    shape: st.shape as string,
    ink_style: st.ink_style as string,
    is_default: Boolean(st.is_default),
    preview_url: st.svg_markup ? stampSvgToDataUrl(st.svg_markup as string) : "",
  }));

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email} roles={admin.roles}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Certificate Verification, Authorized Issuers & Official Stamps
          </h1>
          <p className="mt-1 text-xs text-[var(--adm-ink-muted)]">
            Approve Authorized Organizations to grant Stamp Studio access to the requesting account,
            create or inspect organizational stamps, and verify submitted QR credentials.
          </p>
        </div>
        <VerificationsClient
          initialIssuers={enrichedIssuers}
          initialCerts={certs ?? []}
          initialStamps={stamps}
          initialReports={reports ?? []}
        />
      </div>
    </AdminShell>
  );
}
