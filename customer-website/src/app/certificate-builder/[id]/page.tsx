import React from "react";
import { notFound } from "next/navigation";
import {
  CERTIFICATE_TEMPLATE_CATALOG,
  createDefaultCertificateElements,
  createDefaultCertificateStyle,
  generateCertificateCode,
  type CertificateCanvasElement,
  type CertificateStyleConfig,
} from "@francis/shared";
import {
  getAccessibleIssuersForUser,
  getStampsForApprovedIssuers,
} from "@/lib/issuers";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { CertificateAccessGate } from "@/components/certificate/CertificateAccessGate";
import { CertificateStudio } from "@/components/certificate/CertificateStudio";

export const dynamic = "force-dynamic";

export default async function CertificateEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string; tab?: string; issuer?: string }>;
}) {
  const { id } = await params;
  const { template, tab, issuer } = await searchParams;
  const { supabase, user } = await getAuthenticatedContext();

  const accessResult = user
    ? await getAccessibleIssuersForUser(user)
    : { applications: [], approvedIssuers: [] };

  const orgApplications = accessResult.applications.map((item) => ({
    id: item.id,
    organization_name: item.organization_name,
    contact_email: item.contact_email,
    verification_status: item.verification_status,
    notes: item.notes,
    approved_at: item.approved_at,
  }));

  const approvedIssuers = accessResult.approvedIssuers.map((item) => ({
    id: item.id,
    organization_name: item.organization_name,
  }));

  // Certificate creation & editing is strictly limited to Admin-approved Authorized Organizations
  if (!user || approvedIssuers.length === 0) {
    return (
      <CertificateAccessGate
        isAuthenticated={Boolean(user)}
        applications={orgApplications}
      />
    );
  }

  const [{ data: templates }, organizationStamps] = await Promise.all([
    supabase
      .from("fcs_certificate_templates")
      .select("id, slug, name, category, orientation, layout_config")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    getStampsForApprovedIssuers(approvedIssuers),
  ]);

  const initialTab = tab === "stamps" ? "stamps" : "details";

  const tplList = (
    templates && templates.length > 0
      ? templates
      : CERTIFICATE_TEMPLATE_CATALOG.map((t) => ({
          id: t.slug,
          slug: t.slug,
          name: t.name,
          category: t.category,
          orientation: t.orientation,
          layout_config: t.layoutConfig as unknown as Record<string, unknown>,
        }))
  ) as Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    orientation: "landscape" | "portrait";
    layout_config: Record<string, unknown>;
  }>;

  if (id === "new") {
    const matched = tplList.find((t) => t.slug === template) || tplList[0];
    const cfg = (matched?.layout_config ?? {}) as Record<string, string>;
    const today = new Date().toISOString().slice(0, 10);

    const defaultIssuer =
      (issuer && approvedIssuers.find((item) => item.id === issuer)) ||
      approvedIssuers[0];

    const defaultStamp =
      organizationStamps.find(
        (st) => st.issuer_id === defaultIssuer.id && st.is_default && st.preview_url
      ) || null;

    const initialElements: CertificateCanvasElement[] = defaultStamp
      ? [
          {
            id: `org-stamp-${defaultStamp.id}`,
            type:
              defaultStamp.stamp_kind === "seal"
                ? "seal"
                : defaultStamp.stamp_kind === "signature"
                  ? "signature"
                  : "stamp",
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
            inkStyle:
              defaultStamp.ink_style === "custom" ? "default" : defaultStamp.ink_style,
            isSampleDecorative: false,
          },
        ]
      : createDefaultCertificateElements();

    return (
      <CertificateStudio
        initialCertId={null}
        initialIssuerId={defaultIssuer.id}
        initialCertificateCode={generateCertificateCode()}
        initialTemplateSlug={matched?.slug || "course-completion"}
        initialTitle={cfg.titleDefault || "Certificate of Completion"}
        initialRecipientName="Jordan Taylor"
        initialCourse="Full-Stack Web Engineering Cohort"
        initialOrganization={defaultIssuer.organization_name}
        initialDescription="For demonstrating practical engineering excellence, consistent contribution, and completing all capstone evaluations."
        initialIssueDate={today}
        initialExpiryDate=""
        initialSignatoryName="Program Director"
        initialSignatoryDesignation="Academic & Technical Lead"
        initialOrientation={matched?.orientation || "landscape"}
        initialElements={initialElements}
        initialStyle={createDefaultCertificateStyle({
          backgroundColor: cfg.background || "#FFFDF7",
          primaryColor: cfg.primaryColor || "#0F4C5C",
          accentColor: cfg.accentColor || "#C59B27",
          borderStyle:
            (cfg.borderStyle as CertificateStyleConfig["borderStyle"]) || "double-gold",
          fontDisplay: cfg.fontDisplay || "Cormorant Garamond",
          fontBody: cfg.fontBody || "Plus Jakarta Sans",
        })}
        initialVerificationStatus="unverified_draft"
        initialTab={initialTab}
        templates={tplList}
        approvedIssuers={approvedIssuers}
        organizationApplications={orgApplications}
        initialOrganizationStamps={organizationStamps}
        isAuthenticated={true}
      />
    );
  }

  const { data: cert } = await supabase
    .from("fcs_certificates")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cert) {
    notFound();
  }

  const { data: verRow } = await supabase
    .from("fcs_certificate_verifications")
    .select("verification_status")
    .eq("certificate_id", cert.id)
    .maybeSingle();

  const validSavedIssuerId =
    cert.issuer_id && approvedIssuers.some((iss) => iss.id === cert.issuer_id)
      ? cert.issuer_id
      : approvedIssuers[0].id;

  // Strip any legacy decorative sample stamps automatically so saved certificates stay official
  const cleanedElements = ((cert.canvas_elements as CertificateCanvasElement[]) || []).filter(
    (el) => !el.isSampleDecorative && el.type !== "decorative_badge"
  );

  return (
    <CertificateStudio
      initialCertId={cert.id}
      initialIssuerId={validSavedIssuerId}
      initialCertificateCode={cert.certificate_code}
      initialTemplateSlug={cert.template_slug}
      initialTitle={cert.title}
      initialRecipientName={cert.recipient_name}
      initialCourse={cert.course_or_achievement}
      initialOrganization={cert.organization_name}
      initialDescription={cert.description || ""}
      initialIssueDate={cert.issue_date}
      initialExpiryDate={cert.expiry_date || ""}
      initialSignatoryName={cert.signatory_name || ""}
      initialSignatoryDesignation={cert.signatory_designation || ""}
      initialOrientation={cert.orientation}
      initialElements={cleanedElements}
      initialStyle={{
        ...createDefaultCertificateStyle(),
        ...(cert.style_config as Partial<CertificateStyleConfig>),
      }}
      initialVerificationStatus={verRow?.verification_status || "unverified_draft"}
      initialTab={initialTab}
      templates={tplList}
      approvedIssuers={approvedIssuers}
      organizationApplications={orgApplications}
      initialOrganizationStamps={organizationStamps}
      isAuthenticated={true}
    />
  );
}
