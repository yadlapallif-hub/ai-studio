import React from "react";
import Link from "next/link";
import { RESUME_TEMPLATE_CATALOG } from "@francis/shared";
import { FileText, Plus } from "lucide-react";
import { getAuthenticatedContext } from "@/lib/supabase/server";
import {
  ResumeTemplateGallery,
  type ResumeTemplateCardItem,
} from "@/components/resume/ResumeTemplateGallery";

export const dynamic = "force-dynamic";

export default async function ResumeBuilderGalleryPage() {
  const { supabase, user } = await getAuthenticatedContext();

  const [{ data: templates }, { data: resumes }] = await Promise.all([
    supabase
      .from("fcs_resume_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    user
      ? supabase
          .from("fcs_resumes")
          .select("id, title, template_slug, ats_score, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const templateCards: ResumeTemplateCardItem[] =
    templates && templates.length > 0
      ? (templates as ResumeTemplateCardItem[])
      : RESUME_TEMPLATE_CATALOG.map((t) => ({
          id: t.slug,
          slug: t.slug,
          name: t.name,
          category: t.category,
          description: t.description,
          is_ats_friendly: t.isAtsFriendly,
          layout_config: t.layoutConfig as unknown as Record<string, unknown>,
        }));

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
            AI Resume Studio
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {templateCards.length} Resume Templates — Free Forever
          </h1>
          <p className="mt-1 text-sm text-[var(--fcs-ink-muted)]">
            Every template is 100% free with ATS optimization, drag-and-drop section ordering,
            and print-ready A4 PDF & PNG export.
          </p>
        </div>
        <Link
          href="/resume-builder/new"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" /> Create New Resume
        </Link>
      </div>

      {user && resumes && resumes.length > 0 && (
        <section>
          <h2 className="text-base font-bold">Your Saved Resumes</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r) => (
              <Link
                key={r.id}
                href={`/resume-builder/${r.id}`}
                className="rounded-2xl border border-[var(--fcs-border)] bg-[var(--fcs-surface)] p-5 transition hover:border-teal-600/50"
              >
                <div className="flex items-center justify-between">
                  <FileText className="h-5 w-5 text-teal-600" />
                  {r.ats_score !== null && (
                    <span className="rounded bg-teal-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
                      ATS {r.ats_score}%
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-bold">{r.title}</h3>
                <p className="mt-1 text-xs text-[var(--fcs-ink-muted)]">
                  Template: {r.template_slug}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ResumeTemplateGallery templates={templateCards} />
    </div>
  );
}
