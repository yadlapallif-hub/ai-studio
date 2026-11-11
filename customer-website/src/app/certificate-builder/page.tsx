import React from "react";
import Link from "next/link";
import { CERTIFICATE_TEMPLATE_CATALOG } from "@francis/shared";
import { Award, Clock, Lock, Plus, ShieldCheck, Stamp } from "lucide-react";
import { getAccessibleIssuersForUser } from "@/lib/issuers";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import { SlideReveal } from "@/components/motion/SlideReveal";
import {
  CertificateTemplateGallery,
  type CertificateTemplateCardItem,
} from "@/components/certificate/CertificateTemplateGallery";

export const dynamic = "force-dynamic";

export default async function CertificateBuilderGalleryPage() {
  const { supabase, user } = await getAuthenticatedContext();

  const [{ data: templates }, issuerAccess, { data: certs }] = await Promise.all([
    supabase
      .from("fcs_certificate_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    user
      ? getAccessibleIssuersForUser(user)
      : Promise.resolve({ applications: [], approvedIssuers: [] }),
    user
      ? supabase
          .from("fcs_certificates")
          .select("id, title, recipient_name, certificate_code, template_slug, orientation")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const canCreateCertificates = Boolean(user && issuerAccess.approvedIssuers.length > 0);
  const pendingApplications = issuerAccess.applications.filter(
    (app) => app.verification_status === "pending"
  );

  const templateCards: CertificateTemplateCardItem[] =
    templates && templates.length > 0
      ? (templates as CertificateTemplateCardItem[])
      : CERTIFICATE_TEMPLATE_CATALOG.map((t) => ({
          id: t.slug,
          slug: t.slug,
          name: t.name,
          category: t.category,
          description: t.description,
          orientation: t.orientation,
          layout_config: t.layoutConfig as unknown as Record<string, unknown>,
        }));

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
      <SlideReveal direction="clip">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-amber-400">
              Authorized Organization Certificate Studio
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {templateCards.length} Certificate Templates across 9 Official Categories
            </h1>
            <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
              Certificate creation, custom organizational stamps, signatures, and QR verification are
              available exclusively for Admin-approved Authorized Organizations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {canCreateCertificates ? (
              <>
                <Link
                  href="/stamps"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
                >
                  <Stamp className="h-4 w-4 text-teal-600" /> Stamp Studio
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
                >
                  <ShieldCheck className="h-4 w-4 text-teal-600" /> Verify ID
                </Link>
                <Link
                  href="/certificate-builder/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <Plus className="h-4 w-4" /> New Certificate
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {pendingApplications.length > 0
                    ? "Check Approval Status"
                    : "Apply for Authorized Access"}
                </Link>
                {!user && (
                  <Link
                    href="/auth/login?next=/certificate-builder"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
                  >
                    Sign In
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </SlideReveal>

      {!canCreateCertificates && (
        <SlideReveal direction="up" delay={80}>
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-50 p-5 text-xs text-amber-950 dark:bg-amber-950/35 dark:text-amber-100 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              {pendingApplications.length > 0 ? (
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              ) : (
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              )}
              <div>
                <p className="text-sm font-bold">
                  {!user
                    ? "Certificate Creation Restricted to Authorized Users"
                    : pendingApplications.length > 0
                      ? `Pending Admin Approval for ${pendingApplications
                          .map((a) => a.organization_name)
                          .join(", ")}`
                      : "Authorized Organization Approval Required"}
                </p>
                <p className="mt-1 leading-relaxed opacity-90">
                  {!user
                    ? "Only signed-in users belonging to an Admin-approved Authorized Organization can open the Certificate Studio, add or delete official stamps, and export credentials."
                    : pendingApplications.length > 0
                      ? "Once an Administrator approves your organization request, certificate creation and Stamp Studio unlock automatically for your account."
                      : "Apply as an Authorized Organization with your organization name and account email so an Administrator can grant certificate creation access."}
                </p>
              </div>
            </div>
            <Link
              href={user ? "/verify" : "/auth/login?next=/certificate-builder"}
              className="shrink-0 rounded-xl bg-amber-800 px-4 py-2 font-semibold text-white hover:bg-amber-900"
            >
              {!user
                ? "Sign In →"
                : pendingApplications.length > 0
                  ? "View Status →"
                  : "Apply Now →"}
            </Link>
          </div>
        </SlideReveal>
      )}

      {canCreateCertificates && certs && certs.length > 0 && (
        <SlideReveal direction="up" delay={100}>
          <section>
            <h2 className="text-base font-bold">Your Saved Certificates</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {certs.map((c) => (
                <Link
                  key={c.id}
                  href={`/certificate-builder/${c.id}`}
                  className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 transition hover:border-teal-600/50"
                >
                  <div className="flex items-center justify-between">
                    <Award className="h-5 w-5 text-amber-600" />
                    <span className="font-mono text-[11px] text-[var(--fcs-ink-muted)]">
                      {c.certificate_code}
                    </span>
                  </div>
                  <h3 className="mt-3 font-bold">{c.title}</h3>
                  <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
                    {c.recipient_name} • {c.orientation}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </SlideReveal>
      )}

      <SlideReveal direction="up" delay={140}>
        <CertificateTemplateGallery
          templates={templateCards}
          canCreateCertificates={canCreateCertificates}
        />
      </SlideReveal>
    </div>
  );
}
