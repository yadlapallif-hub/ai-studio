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
import { createServiceSupabase, getAuthenticatedContext } from "@/lib/supabase/server";
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
  const service = user ? createServiceSupabase() : null;

  const [{ data: templates }, { data: myIssuers }] = await Promise.all([
    supabase
      .from("fcs_certificate_templates")
      .select("id, slug, name, category, orientation, layout_config")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    user && service
      ? service
          .from("fcs_authorized_issuers")
          .select("id, organization_name, contact_email, verification_status, notes, approved_at")
          .or(
            user.email
              ? `user_id.eq.${user.id},and(user_id.is.null,contact_email.eq.${user.email.toLowerCase()})`
              : `user_id.eq.${user.id}`
          )
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const orgApplications = (myIssuers ?? []) as Array<{
    id: string;
    organization_name: string;
    contact_email: string;
    verification_status: string;
    notes: string | null;
    approved_at: string | null;
  }>;
  const approvedIssuers = orgApplications
    .filter((item) => item.verification_status === "approved")
    .map((item) => ({
      id: item.id,
      organization_name: item.organization_name,
    }));

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
        initialIssuerId=""
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
        approvedIssuers={approvedIssuers}
        organizationApplications={orgApplications}
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

  const validSavedIssuerId =
    cert.issuer_id && approvedIssuers.some((iss) => iss.id === cert.issuer_id)
      ? cert.issuer_id
      : "";

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
      initialElements={(cert.canvas_elements as CertificateCanvasElement[]) || []}
      initialStyle={{
        ...createDefaultCertificateStyle(),
        ...(cert.style_config as Partial<CertificateStyleConfig>),
      }}
      initialVerificationStatus={verRow?.verification_status || "unverified_draft"}
      templates={tplList}
      approvedIssuers={approvedIssuers}
      organizationApplications={orgApplications}
      isAuthenticated={true}
    />
  );
}
