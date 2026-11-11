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
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { CertificateStudio } from "@/components/certificate/CertificateStudio";

export const dynamic = "force-dynamic";

export default async function CertificateEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { id } = await params;
  const { template } = await searchParams;
  const { supabase, user } = await getAuthenticatedContext();

  const [{ data: templates }, { data: approvedIssuers }] = await Promise.all([
    supabase
      .from("fcs_certificate_templates")
      .select("id, slug, name, category, orientation, layout_config")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    user
      ? supabase
          .from("fcs_authorized_issuers")
          .select("id, organization_name, user_id, contact_email")
          .eq("verification_status", "approved")
          .or(
            user.email
              ? `user_id.eq.${user.id},user_id.is.null,contact_email.eq.${user.email.toLowerCase()}`
              : `user_id.eq.${user.id},user_id.is.null`
          )
      : Promise.resolve({ data: [] }),
  ]);

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

    return (
      <CertificateStudio
        initialCertId={null}
        initialCertificateCode={generateCertificateCode()}
        initialTemplateSlug={matched?.slug || "course-completion"}
        initialTitle={cfg.titleDefault || "Certificate of Completion"}
        initialRecipientName="Jordan Taylor"
        initialCourse="Full-Stack Web Engineering Cohort"
        initialOrganization="FRANCIS Open Learning Initiative"
        initialDescription="For demonstrating practical engineering excellence, consistent contribution, and completing all capstone evaluations."
        initialIssueDate={today}
        initialExpiryDate=""
        initialSignatoryName="Program Director"
        initialSignatoryDesignation="Academic & Technical Lead"
        initialOrientation={matched?.orientation || "landscape"}
        initialElements={createDefaultCertificateElements()}
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
        templates={tplList}
        approvedIssuers={approvedIssuers ?? []}
        isAuthenticated={Boolean(user)}
      />
    );
  }

  if (!user) {
    notFound();
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

  return (
    <CertificateStudio
      initialCertId={cert.id}
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
      initialElements={(cert.canvas_elements as CertificateCanvasElement[]) || []}
      initialStyle={{
        ...createDefaultCertificateStyle(),
        ...(cert.style_config as Partial<CertificateStyleConfig>),
      }}
      initialVerificationStatus={verRow?.verification_status || "unverified_draft"}
      templates={tplList}
      approvedIssuers={approvedIssuers ?? []}
      isAuthenticated={true}
    />
  );
}
