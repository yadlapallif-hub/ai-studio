import React from "react";
import type { Metadata } from "next";
import {
  getAccessibleIssuersForUser,
  getStampsForApprovedIssuers,
} from "@/lib/issuers";
import { buildPageMetadata } from "@/lib/seo";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { StampStudioPageClient } from "@/components/certificate/StampStudioPageClient";
import {
  stampSvgToDataUrl,
  type SignatureLibraryRecord,
  type StampLibraryRecord,
} from "@francis/shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Stamp & Signature Studio & Authorized Organizations",
  description:
    "Design sample stamps and digital signatures or apply for Authorized Organization verification to unlock official stamps and QR credentials.",
  path: "/stamps",
});

export default async function OrganizationStampsPage() {
  const { supabase, user } = await getAuthenticatedContext();

  if (!user) {
    return (
      <StampStudioPageClient
        isAuthenticated={false}
        applications={[]}
        approvedIssuers={[]}
        initialStamps={[]}
        initialSampleStamps={[]}
        initialSignatures={[]}
      />
    );
  }

  const [{ applications, approvedIssuers }, { data: sampleStamps }, { data: signatures }] =
    await Promise.all([
      getAccessibleIssuersForUser(user),
      supabase
        .from("fcs_stamp_library")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("fcs_signature_library")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const simpleApproved = approvedIssuers.map((i) => ({
    id: i.id,
    organization_name: i.organization_name,
  }));
  const initialStamps = await getStampsForApprovedIssuers(simpleApproved);

  const mappedSampleStamps: StampLibraryRecord[] = (sampleStamps ?? []).map((s) => ({
    ...s,
    preview_url: s.svg_markup
      ? stampSvgToDataUrl(s.svg_markup)
      : ((s.config as Record<string, string>)?.dataUrl || ""),
  })) as StampLibraryRecord[];

  return (
    <StampStudioPageClient
      isAuthenticated={true}
      applications={applications.map((a) => ({
        id: a.id,
        organization_name: a.organization_name,
        contact_email: a.contact_email,
        verification_status: a.verification_status,
        notes: a.notes,
      }))}
      approvedIssuers={simpleApproved}
      initialStamps={initialStamps}
      initialSampleStamps={mappedSampleStamps}
      initialSignatures={(signatures ?? []) as SignatureLibraryRecord[]}
    />
  );
}
