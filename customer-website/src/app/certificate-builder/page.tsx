import React from "react";
import { SafeNavLink } from "@/components/ui/SafeNavLink";
import { ALL_CERTIFICATE_TEMPLATES } from "@francis/shared";
import {
  Award,
  Clock,
  FileSpreadsheet,
  FolderOpen,
  Plus,
  ShieldCheck,
  Sparkles,
  Stamp,
} from "lucide-react";
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

  const [{ data: templates }, issuerAccess, { data: certs }, { data: projects }, { data: favs }] =
    await Promise.all([
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
      user
        ? supabase
            .from("fcs_design_projects")
            .select("id, title, template_slug, orientation, status, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("fcs_template_favorites")
            .select("template_slug, is_favorite, last_used_at")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);

  const canCreateOfficial = Boolean(user && issuerAccess.approvedIssuers.length > 0);
  const pendingApplications = issuerAccess.applications.filter(
    (app) => app.verification_status === "pending"
  );

  const dbCards: CertificateTemplateCardItem[] =
    templates && templates.length > 0 ? (templates as CertificateTemplateCardItem[]) : [];

  const existingSlugs = new Set(dbCards.map((c) => c.slug));
  const fallbackCards: CertificateTemplateCardItem[] = ALL_CERTIFICATE_TEMPLATES.filter(
    (t) => !existingSlugs.has(t.slug)
  ).map((t) => ({
    id: t.slug,
    slug: t.slug,
    name: t.name,
    category: t.category,
    description: t.description,
    orientation: t.orientation,
    layout_config: t.layoutConfig as unknown as Record<string, unknown>,
  }));

  const templateCards = [...dbCards, ...fallbackCards];

  const initialFavoriteSlugs = (favs ?? [])
    .filter((f: { is_favorite?: boolean }) => Boolean(f.is_favorite))
    .map((f: { template_slug: string }) => f.template_slug);
  const initialRecentSlugs = (favs ?? [])
    .filter((f: { last_used_at?: string | null }) => Boolean(f.last_used_at))
    .map((f: { template_slug: string }) => f.template_slug);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
      <SlideReveal direction="clip">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-amber-400">
              Visual Certificate & Credential Studio
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {templateCards.length} Certificate Templates across 14 Categories
            </h1>
            <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
              Design, customize, add photos, draw signatures, and export 2K/4K PNG &amp; Print PDF
              for free. Admin-approved organizations unlock Official Verified QR Issuance &amp; Bulk
              CSV/Excel Generation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SafeNavLink
              href="/stamps"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-3.5 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <Stamp className="h-4 w-4 text-teal-600" /> Stamp Studio
            </SafeNavLink>
            <SafeNavLink
              href="/bulk-generator"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-3.5 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <FileSpreadsheet className="h-4 w-4 text-teal-600" /> Bulk Issue
            </SafeNavLink>
            <SafeNavLink
              href="/verify"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--fcs-border)] px-3.5 py-2.5 text-sm font-semibold hover:bg-[var(--fcs-surface-muted)]"
            >
              <ShieldCheck className="h-4 w-4 text-teal-600" /> Verify ID
            </SafeNavLink>
            <SafeNavLink
              href="/certificate-builder/new"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              <Plus className="h-4 w-4" /> Open Studio
            </SafeNavLink>
          </div>
        </div>
      </SlideReveal>

      {!canCreateOfficial && (
        <SlideReveal direction="up" delay={80}>
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-50 p-5 text-xs text-amber-950 dark:bg-amber-950/35 dark:text-amber-100 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              {pendingApplications.length > 0 ? (
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              ) : (
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              )}
              <div>
                <p className="text-sm font-bold">
                  {pendingApplications.length > 0
                    ? `Sample Mode Active — Official Approval Pending for ${pendingApplications
                        .map((a) => a.organization_name)
                        .join(", ")}`
                    : "Design Freely in Sample Mode • Apply for Official Organization Verification"}
                </p>
                <p className="mt-1 leading-relaxed opacity-90">
                  Any user can open the Certificate Studio, generate Sample Stamps, draw handwritten
                  signatures, save personal projects, and export PDF/2K/4K PNG. Apply as an
                  Authorized Organization to unlock Official Organization Seals &amp; Verified QR
                  Publishing.
                </p>
              </div>
            </div>
            <SafeNavLink
              href={user ? "/verify" : "/auth/login?next=/verify"}
              className="shrink-0 rounded-xl bg-amber-800 px-4 py-2 font-semibold text-white hover:bg-amber-900"
            >
              {!user
                ? "Sign In to Apply →"
                : pendingApplications.length > 0
                  ? "View Status →"
                  : "Apply for Official Access →"}
            </SafeNavLink>
          </div>
        </SlideReveal>
      )}

      {projects && projects.length > 0 && (
        <SlideReveal direction="up" delay={90}>
          <section>
            <h2 className="text-base font-bold">Your Saved Design Projects</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {projects.map((p) => (
                <SafeNavLink
                  key={p.id}
                  href={`/certificate-builder/new?project=${p.id}`}
                  className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-4 transition hover:border-teal-600/50"
                >
                  <div className="flex items-center justify-between">
                    <FolderOpen className="h-4 w-4 text-teal-600" />
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      {String(p.status || "in_progress").replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="mt-2.5 line-clamp-1 text-sm font-bold">{p.title}</h3>
                  <p className="mt-1 text-[11px] text-[var(--fcs-ink-muted)]">
                    {p.orientation} • {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </SafeNavLink>
              ))}
            </div>
          </section>
        </SlideReveal>
      )}

      {canCreateOfficial && certs && certs.length > 0 && (
        <SlideReveal direction="up" delay={100}>
          <section>
            <h2 className="text-base font-bold">Your Official Issued Certificates</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {certs.map((c) => (
                <SafeNavLink
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
                </SafeNavLink>
              ))}
            </div>
          </section>
        </SlideReveal>
      )}

      <SlideReveal direction="up" delay={140}>
        <CertificateTemplateGallery
          templates={templateCards}
          canCreateOfficial={canCreateOfficial}
          isAuthenticated={Boolean(user)}
          initialFavoriteSlugs={initialFavoriteSlugs}
          initialRecentSlugs={initialRecentSlugs}
        />
      </SlideReveal>
    </div>
  );
}
