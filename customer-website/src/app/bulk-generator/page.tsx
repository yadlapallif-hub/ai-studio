import React from "react";
import type { Metadata } from "next";
import { ALL_CERTIFICATE_TEMPLATES, type CertificateCanvasElement } from "@francis/shared";
import { getAccessibleIssuersForUser, getStampsForApprovedIssuers } from "@/lib/issuers";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { buildPageMetadata } from "@/lib/seo";
import { BulkGeneratorClient } from "@/components/certificate/BulkGeneratorClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Bulk Certificate Generator — By Quantity or CSV / Excel",
  description:
    "Generate any exact quantity of identical or serialized certificates in one click, or batch generate cohorts via CSV or Excel spreadsheets.",
  path: "/bulk-generator",
  noIndex: true,
});

export default async function BulkGeneratorPage() {
  const { supabase, user } = await getAuthenticatedContext();

  const [{ data: templates }, issuerAccess] = await Promise.all([
    supabase
      .from("fcs_certificate_templates")
      .select("slug, name, orientation, layout_config")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    user
      ? getAccessibleIssuersForUser(user)
      : Promise.resolve({ applications: [], approvedIssuers: [] }),
  ]);

  const approvedIssuers = issuerAccess.approvedIssuers.map((i) => ({
    id: i.id,
    organization_name: i.organization_name,
  }));

  const orgStamps =
    approvedIssuers.length > 0 ? await getStampsForApprovedIssuers(approvedIssuers) : [];
  const defaultStamp = orgStamps.find((s) => s.is_default && s.preview_url) || orgStamps[0] || null;

  const defaultStampElement: CertificateCanvasElement | null = defaultStamp
    ? {
        id: `bulk-stamp-${defaultStamp.id}`,
        type: defaultStamp.stamp_kind === "seal" ? "seal" : "stamp",
        label: defaultStamp.name,
        src: defaultStamp.preview_url,
        x: 75,
        y: 64,
        width: defaultStamp.shape === "rectangle" ? 184 : 122,
        height: defaultStamp.shape === "rectangle" ? 92 : 122,
        rotation: 0,
        opacity: 0.95,
        zIndex: 5,
        shape:
          defaultStamp.shape === "scalloped"
            ? "circle"
            : defaultStamp.shape === "square"
              ? "square"
              : defaultStamp.shape,
        inkStyle: defaultStamp.ink_style === "custom" ? "default" : defaultStamp.ink_style,
        isSampleDecorative: false,
      }
    : null;

  const dbTpls = (templates ?? []) as Array<{
    slug: string;
    name: string;
    orientation: "landscape" | "portrait";
    layout_config: Record<string, unknown>;
  }>;
  const existing = new Set(dbTpls.map((t) => t.slug));
  const fallbackTpls = ALL_CERTIFICATE_TEMPLATES.filter((t) => !existing.has(t.slug)).map((t) => ({
    slug: t.slug,
    name: t.name,
    orientation: t.orientation,
    layout_config: t.layoutConfig as unknown as Record<string, unknown>,
  }));

  return (
    <BulkGeneratorClient
      isAuthenticated={Boolean(user)}
      approvedIssuers={approvedIssuers}
      templates={[...dbTpls, ...fallbackTpls]}
      defaultStampElement={defaultStampElement}
    />
  );
}
