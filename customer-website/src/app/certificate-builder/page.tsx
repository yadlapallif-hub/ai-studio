import React from "react";
import Link from "next/link";
import { CERTIFICATE_TEMPLATE_CATALOG } from "@francis/shared";
import { Award, Plus, ShieldCheck } from "lucide-react";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import {
  CertificateTemplateGallery,
  type CertificateTemplateCardItem,
} from "@/components/certificate/CertificateTemplateGallery";

export const dynamic = "force-dynamic";

export default async function CertificateBuilderGalleryPage() {
  const { supabase, user } = await getAuthenticatedContext();

  const [{ data: templates }, { data: certs }] = await Promise.all([
    supabase
      .from("fcs_certificate_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    user
      ? supabase
          .from("fcs_certificates")
          .select("id, title, recipient_name, certificate_code, template_slug, orientation")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-amber-400">
            AI Certificate & Seal Studio
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {templateCards.length} Certificate Templates across 9 Official Categories
          </h1>
          <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
            Customize borders, typography, recipient photos, stamps & signatures, QR verification,
            and export print-ready A4 PDFs or PNGs for free.
          </p>
        </div>
        <div className="flex gap-2.5">
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
        </div>
      </div>

      {user && certs && certs.length > 0 && (
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
      )}

      <CertificateTemplateGallery templates={templateCards} />
    </div>
  );
}
